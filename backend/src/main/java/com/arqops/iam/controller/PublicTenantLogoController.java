package com.arqops.iam.controller;

import com.arqops.iam.service.TenantBrandingService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/public/tenant-logo")
@RequiredArgsConstructor
public class PublicTenantLogoController {

    private final TenantBrandingService tenantBrandingService;

    @GetMapping("/{tenantId}")
    public ResponseEntity<Resource> getLogo(@PathVariable UUID tenantId) {
        Path path = tenantBrandingService.resolveLogoPath(tenantId);
        if (path == null || !Files.isReadable(path)) {
            return ResponseEntity.notFound().build();
        }
        String name = path.getFileName().toString().toLowerCase();
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (name.endsWith(".png")) {
            mediaType = MediaType.IMAGE_PNG;
        } else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
            mediaType = MediaType.IMAGE_JPEG;
        } else if (name.endsWith(".webp")) {
            mediaType = MediaType.parseMediaType("image/webp");
        } else if (name.endsWith(".gif")) {
            mediaType = MediaType.IMAGE_GIF;
        }
        FileSystemResource resource = new FileSystemResource(path);
        long len;
        try {
            len = resource.contentLength();
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"logo\"")
                .contentType(mediaType)
                .contentLength(len)
                .body(resource);
    }
}
