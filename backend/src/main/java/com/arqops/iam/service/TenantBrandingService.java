package com.arqops.iam.service;

import com.arqops.common.config.BrandingProperties;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.iam.entity.Tenant;
import com.arqops.iam.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TenantBrandingService {

    private static final long MAX_LOGO_BYTES = 2 * 1024 * 1024;

    private final TenantRepository tenantRepository;
    private final BrandingProperties brandingProperties;

    @Transactional
    public String saveLogo(MultipartFile file) {
        UUID tenantId = requireTenantId();
        if (file == null || file.isEmpty()) {
            throw AppException.badRequest("File is required");
        }
        if (file.getSize() > MAX_LOGO_BYTES) {
            throw AppException.badRequest("Logo must be at most 2 MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !isAllowedImage(contentType)) {
            throw AppException.badRequest("Logo must be PNG, JPEG, WebP, or GIF");
        }
        String ext = extensionForMime(contentType);
        Path dir = Path.of(brandingProperties.getLogoStorageDir()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            log.error("Could not create logo directory {}", dir, e);
            throw AppException.badRequest("Could not store logo");
        }
        deleteExistingLogoFiles(dir, tenantId);
        Path target = dir.resolve(tenantId + ext);
        try {
            file.transferTo(target.toFile());
        } catch (IOException e) {
            log.error("Could not write logo for tenant {}", tenantId, e);
            throw AppException.badRequest("Could not store logo");
        }
        String base = brandingProperties.getPublicApiUrl().replaceAll("/$", "");
        String url = base + "/api/v1/public/tenant-logo/" + tenantId;
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> AppException.notFound("Tenant", tenantId));
        tenant.setLogoUrl(url);
        tenantRepository.save(tenant);
        return url;
    }

    @Transactional
    public void clearLogo() {
        UUID tenantId = requireTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> AppException.notFound("Tenant", tenantId));
        deleteLogoFilesOnDisk(tenantId);
        tenant.setLogoUrl(null);
        tenantRepository.save(tenant);
    }

    public Path resolveLogoPath(UUID tenantId) {
        Path dir = Path.of(brandingProperties.getLogoStorageDir()).toAbsolutePath().normalize();
        for (String ext : new String[] { ".png", ".jpg", ".jpeg", ".webp", ".gif" }) {
            Path p = dir.resolve(tenantId + ext);
            if (Files.isRegularFile(p)) {
                return p;
            }
        }
        return null;
    }

    private void deleteExistingLogoFiles(Path dir, UUID tenantId) {
        for (String ext : new String[] { ".png", ".jpg", ".jpeg", ".webp", ".gif" }) {
            Path p = dir.resolve(tenantId + ext);
            try {
                Files.deleteIfExists(p);
            } catch (IOException ignored) {
                // continue
            }
        }
    }

    private void deleteLogoFilesOnDisk(UUID tenantId) {
        Path dir = Path.of(brandingProperties.getLogoStorageDir()).toAbsolutePath().normalize();
        deleteExistingLogoFiles(dir, tenantId);
    }

    private static boolean isAllowedImage(String contentType) {
        String ct = contentType.toLowerCase(Locale.ROOT);
        return ct.equals("image/png")
                || ct.equals("image/jpeg")
                || ct.equals("image/webp")
                || ct.equals("image/gif");
    }

    private static String extensionForMime(String contentType) {
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> ".bin";
        };
    }

    private static UUID requireTenantId() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            throw AppException.forbidden("A workspace context is required");
        }
        return tenantId;
    }
}
