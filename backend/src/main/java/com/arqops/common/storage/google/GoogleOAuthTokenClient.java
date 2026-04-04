package com.arqops.common.storage.google;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class GoogleOAuthTokenClient {

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    private final ObjectMapper objectMapper;

    public GoogleOAuthTokenClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public TokenResponse exchangeAuthorizationCode(
            String code, String redirectUri, String clientId, String clientSecret)
            throws IOException, InterruptedException {
        String body = formBody(
                "code", code,
                "client_id", clientId,
                "client_secret", clientSecret,
                "redirect_uri", redirectUri,
                "grant_type", "authorization_code");
        return postToken(body);
    }

    public TokenResponse refreshAccessToken(String refreshToken, String clientId, String clientSecret)
            throws IOException, InterruptedException {
        String body = formBody(
                "refresh_token", refreshToken,
                "client_id", clientId,
                "client_secret", clientSecret,
                "grant_type", "refresh_token");
        return postToken(body);
    }

    private TokenResponse postToken(String formBody) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create("https://oauth2.googleapis.com/token"))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(formBody))
                .build();
        HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IOException("Token endpoint HTTP " + response.statusCode() + ": " + response.body());
        }
        JsonNode root = objectMapper.readTree(response.body());
        String access = text(root, "access_token");
        String refresh = text(root, "refresh_token");
        long expiresIn = root.path("expires_in").asLong(3600);
        return new TokenResponse(access, refresh, expiresIn);
    }

    private static String text(JsonNode n, String field) {
        JsonNode v = n.get(field);
        return v != null && !v.isNull() ? v.asText() : null;
    }

    public String fetchPrimaryEmail(String accessToken) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create("https://www.googleapis.com/oauth2/v2/userinfo"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();
        HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            return null;
        }
        JsonNode root = objectMapper.readTree(response.body());
        return text(root, "email");
    }

    private static String formBody(String... kv) {
        if (kv.length % 2 != 0) {
            throw new IllegalArgumentException("pairs");
        }
        return Stream.iterate(0, i -> i + 2)
                .limit(kv.length / 2)
                .map(i -> URLEncoder.encode(kv[i], StandardCharsets.UTF_8)
                        + "="
                        + URLEncoder.encode(kv[i + 1], StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));
    }

    public record TokenResponse(String accessToken, String refreshToken, long expiresInSeconds) {}
}
