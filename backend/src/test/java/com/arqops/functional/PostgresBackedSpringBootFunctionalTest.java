package com.arqops.functional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.client.DefaultResponseErrorHandler;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.io.IOException;

/**
 * Shared full-stack test harness: Spring Boot on a random port + Flyway + PostgreSQL (Testcontainers).
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "logging.level.org.springframework.web=WARN",
                "logging.level.org.hibernate.SQL=WARN"
        }
)
@Testcontainers
@Tag("integration")
public abstract class PostgresBackedSpringBootFunctionalTest {

    @SuppressWarnings("resource")
    @Container
    protected static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("architect_saas")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void datasourceProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    protected TestRestTemplate rest;

    @Autowired
    protected ObjectMapper objectMapper;

    @BeforeEach
    void configureRestTemplateForFunctionalAsserts() {
        var connectionManager = PoolingHttpClientConnectionManagerBuilder.create().build();
        var httpClient = HttpClients.custom().setConnectionManager(connectionManager).build();
        rest.getRestTemplate().setRequestFactory(new HttpComponentsClientHttpRequestFactory(httpClient));
        rest.getRestTemplate().setErrorHandler(new DefaultResponseErrorHandler() {
            @Override
            public boolean hasError(ClientHttpResponse response) throws IOException {
                return false;
            }
        });
    }

    protected ResponseEntity<String> postJson(String path, String json) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return rest.postForEntity(path, new HttpEntity<>(json, headers), String.class);
    }

    protected ResponseEntity<String> postJsonWithBearer(String path, String json, String bearerToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(bearerToken);
        return rest.postForEntity(path, new HttpEntity<>(json, headers), String.class);
    }

    protected ResponseEntity<String> getWithBearer(String path, String bearerToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(bearerToken);
        return rest.exchange(path, HttpMethod.GET, new HttpEntity<>(headers), String.class);
    }

    protected String loginTenantAccessToken(String email, String password) throws Exception {
        ResponseEntity<String> response = postJson(
                "/api/v1/auth/login",
                """
                {"email":"%s","password":"%s"}
                """.formatted(email, password));
        JsonNode root = objectMapper.readTree(response.getBody());
        return root.path("data").path("accessToken").asText();
    }

    protected String loginPlatformAccessToken(String email, String password) throws Exception {
        ResponseEntity<String> response = postJson(
                "/api/v1/platform/auth/login",
                """
                {"email":"%s","password":"%s"}
                """.formatted(email, password));
        JsonNode root = objectMapper.readTree(response.getBody());
        return root.path("data").path("accessToken").asText();
    }
}
