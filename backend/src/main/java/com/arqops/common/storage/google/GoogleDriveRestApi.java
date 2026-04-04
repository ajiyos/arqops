package com.arqops.common.storage.google;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Path;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class GoogleDriveRestApi {

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    private static final String DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
    private static final String DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";

    private final ObjectMapper objectMapper;

    public GoogleDriveRestApi(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String createFolder(String accessToken, String name, String parentId) throws IOException, InterruptedException {
        String json = objectMapper.writeValueAsString(Map.of(
                "name", name,
                "mimeType", "application/vnd.google-apps.folder",
                "parents", List.of(parentId)));
        HttpRequest request = HttpRequest.newBuilder(URI.create(DRIVE_FILES))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
        HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IOException("createFolder HTTP " + response.statusCode() + ": " + response.body());
        }
        JsonNode root = objectMapper.readTree(response.body());
        return root.get("id").asText();
    }

    public Optional<String> findChildFolderId(String accessToken, String parentId, String segment)
            throws IOException, InterruptedException {
        String q = "mimeType='application/vnd.google-apps.folder' and name='" + escapeQuery(segment)
                + "' and '" + parentId + "' in parents and trashed=false";
        String uri = DRIVE_FILES + "?q=" + URLEncoder.encode(q, StandardCharsets.UTF_8)
                + "&fields=files(id)&spaces=drive";
        HttpRequest request = HttpRequest.newBuilder(URI.create(uri))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();
        HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IOException("list files HTTP " + response.statusCode() + ": " + response.body());
        }
        JsonNode files = objectMapper.readTree(response.body()).path("files");
        if (!files.isArray() || files.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(files.get(0).get("id").asText());
    }

    public ResumableUploadSession initiateResumableUpload(
            String accessToken,
            String fileName,
            String mimeType,
            String parentFolderId) throws IOException, InterruptedException {
        return initiateResumableUpload(accessToken, fileName, mimeType, parentFolderId, null);
    }

    /**
     * @param contentLengthBytes optional; when set, sent as X-Upload-Content-Length (recommended by Google).
     */
    public ResumableUploadSession initiateResumableUpload(
            String accessToken,
            String fileName,
            String mimeType,
            String parentFolderId,
            Long contentLengthBytes) throws IOException, InterruptedException {

        String metaJson = objectMapper.writeValueAsString(Map.of(
                "name", fileName,
                "parents", List.of(parentFolderId)));
        String uploadMime = mimeType != null && !mimeType.isBlank() ? mimeType : "application/octet-stream";

        HttpRequest.Builder rb = HttpRequest.newBuilder(URI.create(DRIVE_UPLOAD + "?uploadType=resumable"))
                .timeout(Duration.ofSeconds(60))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json; charset=UTF-8")
                .header("X-Upload-Content-Type", uploadMime);
        if (contentLengthBytes != null && contentLengthBytes >= 0) {
            rb.header("X-Upload-Content-Length", Long.toString(contentLengthBytes));
        }
        HttpRequest request = rb.POST(HttpRequest.BodyPublishers.ofString(metaJson)).build();

        HttpResponse<Void> response = HTTP.send(request, HttpResponse.BodyHandlers.discarding());
        if (response.statusCode() != 200) {
            throw new IOException("resumable initiate HTTP " + response.statusCode());
        }
        Optional<String> location = response.headers().firstValue("location");
        if (location.isEmpty()) {
            throw new IOException("Missing Location header from Drive resumable initiate");
        }
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Content-Type", uploadMime);
        return new ResumableUploadSession(location.get(), headers,
                "PUT the file bytes to uploadUrl with Content-Length set to the full file size.");
    }

    /**
     * Completes a resumable session with the full file (server-side). Uses {@link BodyPublishers#ofFile}
     * so Content-Length matches bytes on disk; {@link InputStream}-based PUT with multipart temp files is brittle.
     */
    public JsonNode completeResumableUploadFile(
            String accessToken,
            String uploadUrl,
            String contentType,
            Path filePath) throws IOException, InterruptedException {

        String ct = contentType != null && !contentType.isBlank() ? contentType : "application/octet-stream";
        URI uri;
        try {
            uri = URI.create(uploadUrl);
        } catch (IllegalArgumentException e) {
            throw new IOException("Invalid resumable upload URL", e);
        }
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofMinutes(30))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", ct)
                .PUT(HttpRequest.BodyPublishers.ofFile(filePath))
                .build();
        HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
        int code = response.statusCode();
        if (code != 200 && code != 201) {
            throw new IOException("resumable PUT HTTP " + code + ": " + response.body());
        }
        return objectMapper.readTree(response.body());
    }

    public JsonNode getFileMetadata(String accessToken, String fileId, String fields)
            throws IOException, InterruptedException {
        String uri = DRIVE_FILES + "/" + URLEncoder.encode(fileId, StandardCharsets.UTF_8)
                + "?fields=" + URLEncoder.encode(fields, StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder(URI.create(uri))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();
        HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 404) {
            return null;
        }
        if (response.statusCode() / 100 != 2) {
            throw new IOException("getFile HTTP " + response.statusCode() + ": " + response.body());
        }
        return objectMapper.readTree(response.body());
    }

    public InputStream openMediaStream(String accessToken, String fileId) throws IOException, InterruptedException {
        String uri = DRIVE_FILES + "/" + URLEncoder.encode(fileId, StandardCharsets.UTF_8) + "?alt=media";
        HttpRequest request = HttpRequest.newBuilder(URI.create(uri))
                .timeout(Duration.ofSeconds(300))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();
        HttpResponse<InputStream> response = HTTP.send(request, HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() / 100 != 2) {
            response.body().close();
            throw new IOException("openMedia HTTP " + response.statusCode());
        }
        return response.body();
    }

    private static String escapeQuery(String name) {
        return name.replace("\\", "\\\\").replace("'", "\\'");
    }

    public record ResumableUploadSession(String uploadUrl, Map<String, String> uploadHeaders, String instructions) {}
}
