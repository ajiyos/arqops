package com.arqops.contract.service;

import com.arqops.common.exception.AppException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
@Component
@RequiredArgsConstructor
public class OpenAiContractClient {

    private final ObjectMapper objectMapper;

    @Value("${app.openai.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    public String chatCompletion(String apiKey, String model, String systemPrompt, String userMessage) {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("model", model);
            ArrayNode messages = root.putArray("messages");
            ObjectNode sys = messages.addObject();
            sys.put("role", "system");
            sys.put("content", systemPrompt);
            ObjectNode user = messages.addObject();
            user.put("role", "user");
            user.put("content", userMessage);

            String json = objectMapper.writeValueAsString(root);
            String url = baseUrl.endsWith("/") ? baseUrl + "chat/completions" : baseUrl + "/chat/completions";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(120))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();

            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(30)).build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw AppException.badRequest("OpenAI API error (" + response.statusCode() + "): "
                        + truncate(response.body(), 500));
            }

            JsonNode tree = objectMapper.readTree(response.body());
            JsonNode choices = tree.get("choices");
            if (choices == null || !choices.isArray() || choices.isEmpty()) {
                throw AppException.badRequest("OpenAI returned no choices");
            }
            JsonNode message = choices.get(0).get("message");
            if (message == null) {
                throw AppException.badRequest("OpenAI response missing message");
            }
            JsonNode content = message.get("content");
            if (content == null || !content.isTextual()) {
                throw AppException.badRequest("OpenAI response missing text content");
            }
            return content.asText();
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw AppException.badRequest("Failed to call OpenAI: " + e.getMessage());
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
