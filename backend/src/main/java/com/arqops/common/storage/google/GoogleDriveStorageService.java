package com.arqops.common.storage.google;

import com.arqops.common.exception.AppException;
import com.arqops.common.storage.FileDownload;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.iam.entity.Tenant;
import com.arqops.iam.repository.TenantRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class GoogleDriveStorageService {

    private final TenantRepository tenantRepository;
    private final GoogleDriveAccessTokenProvider accessTokenProvider;
    private final GoogleDriveRestApi driveRestApi;

    public Map<String, Object> createUploadSession(String fileName, String mimeType, String folderPath) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> AppException.notFound("Tenant", tenantId));
        String rootId = tenant.getGoogleRootFolderId();
        if (rootId == null || rootId.isBlank()) {
            throw AppException.forbidden("Connect Google Drive in Settings before uploading files");
        }
        String access = accessTokenProvider.requireAccessToken(tenantId);
        try {
            String parentId = resolveParentFolderId(access, rootId, folderPath);
            GoogleDriveRestApi.ResumableUploadSession session = driveRestApi.initiateResumableUpload(
                    access, fileName, mimeType, parentId);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("uploadUrl", session.uploadUrl());
            body.put("uploadHeaders", session.uploadHeaders());
            body.put("instructions", session.instructions());
            return body;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw AppException.badRequest("Could not start Google Drive upload: interrupted");
        } catch (IOException e) {
            throw AppException.badRequest("Could not start Google Drive upload: " + e.getMessage());
        }
    }

    /** Streams file to Drive server-side (required: Google resumable upload URLs are not browser CORS-enabled). */
    public String uploadMultipartToGoogleDrive(MultipartFile file, String folderPath) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            throw AppException.forbidden("A workspace context is required to upload files");
        }
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> AppException.notFound("Tenant", tenantId));
        String rootId = tenant.getGoogleRootFolderId();
        if (rootId == null || rootId.isBlank()) {
            throw AppException.forbidden("Connect Google Drive in Settings before uploading files");
        }
        if (file == null || file.isEmpty()) {
            throw AppException.badRequest("File is required");
        }
        String rawName = file.getOriginalFilename();
        String fileName = rawName != null && !rawName.isBlank() ? rawName : "upload";
        String declaredType = file.getContentType();
        String mime = declaredType != null && !declaredType.isBlank()
                ? declaredType
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        String access = accessTokenProvider.requireAccessToken(tenantId);
        Path temp = null;
        try {
            temp = Files.createTempFile("arqops-gdrive-", ".upload");
            file.transferTo(temp);
            long size = Files.size(temp);
            String parentId = resolveParentFolderId(access, rootId, folderPath);
            GoogleDriveRestApi.ResumableUploadSession session = driveRestApi.initiateResumableUpload(
                    access, fileName, mime, parentId, size);
            JsonNode meta = driveRestApi.completeResumableUploadFile(
                    access, session.uploadUrl(), mime, temp);
            JsonNode idNode = meta.get("id");
            if (idNode == null || idNode.asText().isBlank()) {
                throw new IOException("Drive response missing file id");
            }
            return idNode.asText();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw AppException.badRequest("Google Drive upload interrupted");
        } catch (IOException e) {
            throw AppException.badRequest("Google Drive upload failed: " + e.getMessage());
        } finally {
            if (temp != null) {
                try {
                    Files.deleteIfExists(temp);
                } catch (IOException ignored) {
                }
            }
        }
    }

    private String resolveParentFolderId(String accessToken, String rootFolderId, String folderPath)
            throws IOException, InterruptedException {
        if (folderPath == null || folderPath.isBlank()) {
            return rootFolderId;
        }
        String[] parts = Stream.of(folderPath.replace('\\', '/').split("/"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
        if (parts.length == 0) {
            return rootFolderId;
        }
        String current = rootFolderId;
        for (String segment : parts) {
            Optional<String> existing = driveRestApi.findChildFolderId(accessToken, current, segment);
            if (existing.isPresent()) {
                current = existing.get();
            } else {
                current = driveRestApi.createFolder(accessToken, segment, current);
            }
        }
        return current;
    }

    public void assertFileInTenantScope(String googleFileId, UUID tenantId) {
        if (googleFileId == null || googleFileId.isBlank()) {
            throw AppException.badRequest("File id is required");
        }
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> AppException.notFound("Tenant", tenantId));
        String rootId = tenant.getGoogleRootFolderId();
        if (rootId == null || rootId.isBlank()) {
            throw AppException.forbidden("Google Drive is not connected for this workspace");
        }
        String access = accessTokenProvider.requireAccessToken(tenantId);
        try {
            if (!isDescendantOf(access, googleFileId, rootId)) {
                throw AppException.forbidden("File is not in this workspace Google Drive folder");
            }
        } catch (IOException e) {
            throw AppException.badRequest("Could not verify file in Google Drive");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw AppException.badRequest("Interrupted while verifying file");
        }
    }

    private boolean isDescendantOf(String accessToken, String fileId, String rootFolderId)
            throws IOException, InterruptedException {
        String current = fileId;
        for (int depth = 0; depth < 64; depth++) {
            JsonNode meta = driveRestApi.getFileMetadata(accessToken, current, "id,parents");
            if (meta == null) {
                return false;
            }
            JsonNode parents = meta.get("parents");
            if (parents == null || !parents.isArray() || parents.isEmpty()) {
                return false;
            }
            for (JsonNode p : parents) {
                String pid = p.asText();
                if (rootFolderId.equals(pid)) {
                    return true;
                }
            }
            current = parents.get(0).asText();
        }
        return false;
    }

    public FileDownload openTenantFileDownload(String googleFileId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        assertFileInTenantScope(googleFileId, tenantId);
        String access = accessTokenProvider.requireAccessToken(tenantId);
        try {
            JsonNode meta = driveRestApi.getFileMetadata(access, googleFileId, "name,mimeType");
            if (meta == null) {
                throw AppException.notFound("DriveFile", googleFileId);
            }
            String name = meta.path("name").asText("download");
            String mime = meta.path("mimeType").asText(MediaType.APPLICATION_OCTET_STREAM_VALUE);
            InputStream in = driveRestApi.openMediaStream(access, googleFileId);
            return new FileDownload(in, name, mime);
        } catch (IOException e) {
            throw AppException.badRequest("Failed to open file from Google Drive");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw AppException.badRequest("Interrupted while opening file");
        }
    }
}
