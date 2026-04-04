package com.arqops.common.storage;

import com.arqops.common.dto.ApiResponse;
import com.arqops.common.storage.google.GoogleDriveStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final GoogleDriveStorageService googleDriveStorageService;

    @PostMapping("/upload-session")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createUploadSession(
            @Valid @RequestBody UploadSessionRequest request) {
        Map<String, Object> body = googleDriveStorageService.createUploadSession(
                request.fileName(),
                request.mimeType(),
                request.folderPath());
        return ResponseEntity.ok(ApiResponse.success(body));
    }

    /** Multipart upload proxied to Google Drive (avoids CORS on browser → googleapis.com). */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadDriveFile(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "folderPath", required = false) String folderPath) {
        String id = googleDriveStorageService.uploadMultipartToGoogleDrive(file, folderPath);
        return ResponseEntity.ok(ApiResponse.success(Map.of("id", id)));
    }

    @GetMapping("/{fileId}/download")
    public ResponseEntity<StreamingResponseBody> download(@PathVariable String fileId) {
        FileDownload fd = googleDriveStorageService.openTenantFileDownload(fileId);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(fd.fileName(), StandardCharsets.UTF_8)
                .build();
        StreamingResponseBody body = outputStream -> {
            try (fd) {
                fd.inputStream().transferTo(outputStream);
            }
        };
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(fd.contentType()))
                .body(body);
    }
}
