package com.arqops.functional;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end HTTP checks: smoke + tenant isolation / RBAC (BRD AC-03, NFR-01, FR-IAM-09).
 * <p>
 * Kept in one class so Testcontainers PostgreSQL is not stopped between suites (static container
 * lifecycle is per test class).
 * </p>
 * <p>
 * Requires Docker. Seed data: Flyway {@code V8} demo tenant. Demo admin {@code admin@demo.arqops.com} /
 * {@code admin123}. Platform {@code platform@arqops.local} / {@code admin123}.
 * </p>
 */
class FunctionalVerificationTest extends PostgresBackedSpringBootFunctionalTest {

    private static final String DEMO_ADMIN_EMAIL = "admin@demo.arqops.com";
    private static final String DEMO_ADMIN_PASSWORD = "admin123";
    private static final String PLATFORM_EMAIL = "platform@arqops.local";
    private static final String PLATFORM_PASSWORD = "admin123";

    /** V13 — demo tenant clients */
    private static final UUID DEMO_SEED_CLIENT_ID = UUID.fromString("e1a10000-0001-4001-8001-000000000001");
    private static final UUID DEMO_SEED_INVOICE_ID = UUID.fromString("f3110001-0003-4003-8003-000000000001");
    private static final UUID DEMO_SEED_EMPLOYEE_ID = UUID.fromString("a4010001-0010-4010-a010-000000000001");

    private static final String DEMO_PROJECT_NAME = "Sharma Residence";
    private static final String DEMO_PROJECT_NAME_2 = "TechPark Office Interiors";
    private static final String DEMO_CLIENT_NAME_FRAGMENT = "Sharma Family HUF";

    @Test
    void actuatorHealth_isReachableWithoutAuth() {
        ResponseEntity<String> response = rest.getForEntity("/actuator/health", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    void openApiDocs_isReachableWithoutAuth() {
        ResponseEntity<String> response = rest.getForEntity("/api-docs", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("openapi");
    }

    @Test
    void tenantLogin_withSeedUser_returnsAccessToken() throws Exception {
        ResponseEntity<String> response = postJson(
                "/api/v1/auth/login",
                """
                {"email":"%s","password":"%s"}
                """.formatted(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode root = objectMapper.readTree(response.getBody());
        assertThat(root.path("data").path("accessToken").asText()).isNotBlank();
        assertThat(root.path("data").path("refreshToken").asText()).isNotBlank();
        assertThat(root.path("data").path("tenantId").asText()).isNotBlank();
    }

    @Test
    void tenantLogin_invalidPassword_returnsUnauthorized() throws Exception {
        ResponseEntity<String> response = postJson(
                "/api/v1/auth/login",
                """
                {"email":"%s","password":"wrong-password"}
                """.formatted(DEMO_ADMIN_EMAIL));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        JsonNode root = objectMapper.readTree(response.getBody());
        assertThat(root.path("error").path("code").asText()).isEqualTo("UNAUTHORIZED");
    }

    @Test
    void tenantProfile_withoutToken_returnsUnauthorized() {
        ResponseEntity<String> response = rest.getForEntity("/api/v1/tenant/profile", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void tenantProfile_withToken_returnsDemoTenant() throws Exception {
        String token = loginTenantAccessToken(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<String> response = rest.exchange(
                "/api/v1/tenant/profile",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode root = objectMapper.readTree(response.getBody());
        assertThat(root.path("data").path("name").asText()).isEqualTo("Demo Architecture Firm");
        assertThat(root.path("data").path("subdomainSlug").asText()).isEqualTo("demo");
    }

    @Test
    void tenantRegister_withUniqueSlug_returnsCreated() throws Exception {
        String slug = "fv-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String email = "admin+" + slug + "@example.com";
        ResponseEntity<String> response = postJson(
                "/api/v1/tenant",
                """
                {
                  "name": "Functional Test Org",
                  "subdomainSlug": "%s",
                  "adminEmail": "%s",
                  "adminName": "Test Admin",
                  "adminPassword": "TestPassword1!",
                  "plan": "starter"
                }
                """.formatted(slug, email));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        JsonNode root = objectMapper.readTree(response.getBody());
        assertThat(root.path("data").path("subdomainSlug").asText()).isEqualTo(slug);
    }

    /**
     * Full happy path on a fresh tenant: register firm, admin login, HR employee, CRM client,
     * project for that client, finance invoice linked to project. Designation must match
     * {@link com.arqops.hr.DesignationRateDefaults#SEED_ROWS} (seeded on tenant create).
     */
    @Test
    @Tag("e2e")
    void endToEnd_firmCreation_employee_client_project_invoice() throws Exception {
        String slug = "e2e-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String adminEmail = "e2e+" + slug + "@example.com";
        String password = "E2eTestPassword1!";

        ResponseEntity<String> reg = postJson(
                "/api/v1/tenant",
                """
                {
                  "name": "E2E Verification Firm",
                  "subdomainSlug": "%s",
                  "adminEmail": "%s",
                  "adminName": "E2E Admin",
                  "adminPassword": "%s",
                  "plan": "starter"
                }
                """.formatted(slug, adminEmail, password));
        assertThat(reg.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        JsonNode tenantRoot = objectMapper.readTree(reg.getBody());
        assertThat(tenantRoot.path("data").path("subdomainSlug").asText()).isEqualTo(slug);
        UUID tenantId = UUID.fromString(tenantRoot.path("data").path("id").asText());

        ResponseEntity<String> login = postJson(
                "/api/v1/auth/login",
                """
                {"email":"%s","password":"%s"}
                """.formatted(adminEmail, password));
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode loginRoot = objectMapper.readTree(login.getBody());
        String token = loginRoot.path("data").path("accessToken").asText();
        assertThat(token).isNotBlank();
        assertThat(UUID.fromString(loginRoot.path("data").path("tenantId").asText())).isEqualTo(tenantId);

        ResponseEntity<String> profile = getWithBearer("/api/v1/tenant/profile", token);
        assertThat(profile.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(objectMapper.readTree(profile.getBody()).path("data").path("name").asText())
                .isEqualTo("E2E Verification Firm");

        ResponseEntity<String> emp = postJsonWithBearer(
                "/api/v1/hr/employees",
                """
                {
                  "employeeCode": "E2E-001",
                  "name": "E2E Onboarded Employee",
                  "designation": "Architect",
                  "department": "Design",
                  "dateOfJoining": "2026-01-15",
                  "phone": "+919876543210",
                  "personalEmail": "employee.e2e@example.com",
                  "pan": "ABCDE1234F",
                  "status": "active"
                }
                """,
                token);
        assertThat(emp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        JsonNode empData = objectMapper.readTree(emp.getBody()).path("data");
        UUID employeeId = UUID.fromString(empData.path("id").asText());
        assertThat(empData.path("name").asText()).isEqualTo("E2E Onboarded Employee");

        ResponseEntity<String> client = postJsonWithBearer(
                "/api/v1/crm/clients",
                """
                {"name":"E2E Customer Corp","type":"company"}
                """,
                token);
        assertThat(client.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID clientId = UUID.fromString(objectMapper.readTree(client.getBody()).path("data").path("id").asText());

        ResponseEntity<String> project = postJsonWithBearer(
                "/api/v1/project/projects",
                """
                {
                  "clientId": "%s",
                  "name": "E2E Onboarding Project",
                  "type": "Residential",
                  "status": "active"
                }
                """.formatted(clientId),
                token);
        assertThat(project.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        JsonNode projData = objectMapper.readTree(project.getBody()).path("data");
        UUID projectId = UUID.fromString(projData.path("id").asText());
        assertThat(projData.path("clientId").asText()).isEqualTo(clientId.toString());

        ResponseEntity<String> invoice = postJsonWithBearer(
                "/api/v1/finance/invoices",
                """
                {
                  "clientId": "%s",
                  "projectId": "%s",
                  "invoiceDate": "2026-04-01",
                  "dueDate": "2026-05-01",
                  "lineItemsJson": [
                    {"description": "Professional services", "quantity": 1, "unitPrice": 100000, "amount": 100000}
                  ],
                  "sacCode": "998321",
                  "cgst": 9000,
                  "sgst": 9000,
                  "igst": 0,
                  "total": 118000,
                  "status": "draft"
                }
                """.formatted(clientId, projectId),
                token);
        assertThat(invoice.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        JsonNode invData = objectMapper.readTree(invoice.getBody()).path("data");
        UUID invoiceId = UUID.fromString(invData.path("id").asText());
        assertThat(invData.path("invoiceNumber").asText()).startsWith("INV-2026-");
        assertThat(invData.path("clientId").asText()).isEqualTo(clientId.toString());
        assertThat(invData.path("projectId").asText()).isEqualTo(projectId.toString());

        assertThat(getWithBearer("/api/v1/hr/employees/" + employeeId, token).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(getWithBearer("/api/v1/crm/clients/" + clientId, token).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(getWithBearer("/api/v1/project/projects/" + projectId, token).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(getWithBearer("/api/v1/finance/invoices/" + invoiceId, token).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    void authRefresh_withValidRefreshToken_returnsNewPair() throws Exception {
        ResponseEntity<String> login = postJson(
                "/api/v1/auth/login",
                """
                {"email":"%s","password":"%s"}
                """.formatted(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD));
        JsonNode loginRoot = objectMapper.readTree(login.getBody());
        String refresh = loginRoot.path("data").path("refreshToken").asText();

        ResponseEntity<String> refreshResponse = postJson(
                "/api/v1/auth/refresh",
                """
                {"refreshToken":"%s"}
                """.formatted(refresh));

        assertThat(refreshResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(refreshResponse.getBody());
        assertThat(body.path("data").path("accessToken").asText()).isNotBlank();
        assertThat(body.path("data").path("refreshToken").asText()).isNotBlank();
    }

    @Test
    void platformLogin_returnsPlatformToken() throws Exception {
        ResponseEntity<String> response = postJson(
                "/api/v1/platform/auth/login",
                """
                {"email":"%s","password":"%s"}
                """.formatted(PLATFORM_EMAIL, PLATFORM_PASSWORD));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode root = objectMapper.readTree(response.getBody());
        assertThat(root.path("data").path("accessToken").asText()).isNotBlank();
        assertThat(root.path("data").path("email").asText()).isEqualTo(PLATFORM_EMAIL);
    }

    @Test
    void platformTenants_withPlatformToken_returnsPage() throws Exception {
        String token = loginPlatformAccessToken(PLATFORM_EMAIL, PLATFORM_PASSWORD);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<String> response = rest.exchange(
                "/api/v1/platform/tenants?page=0&size=10",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode root = objectMapper.readTree(response.getBody());
        assertThat(root.path("data").path("content").isArray()).isTrue();
        assertThat(root.path("data").path("totalElements").asLong()).isPositive();
    }

    @Test
    void crmLeadStages_withTenantToken_returnsArray() throws Exception {
        String token = loginTenantAccessToken(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<String> response = rest.exchange(
                "/api/v1/crm/leads/stages",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode root = objectMapper.readTree(response.getBody());
        assertThat(root.path("data").isArray()).isTrue();
        assertThat(root.path("data").size()).isPositive();
    }

    @Test
    void projectProjects_withTenantToken_returnsSeededProjects() throws Exception {
        String token = loginTenantAccessToken(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<String> response = rest.exchange(
                "/api/v1/project/projects?page=0&size=20",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode root = objectMapper.readTree(response.getBody());
        assertThat(root.path("data").isArray()).isTrue();
        assertThat(root.path("data").size()).isPositive();
        assertThat(root.path("meta").path("totalElements").asLong()).isPositive();
    }

    @Test
    void reportsDashboard_withoutToken_returnsUnauthorized() {
        ResponseEntity<String> response = rest.getForEntity(
                "/api/v1/reports/dashboard",
                String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void reportsDashboard_withTenantToken_returnsPayload() throws Exception {
        String token = loginTenantAccessToken(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<String> response = rest.exchange(
                "/api/v1/reports/dashboard",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode root = objectMapper.readTree(response.getBody());
        assertThat(root.path("data").isMissingNode()).isFalse();
    }

    // ── Tenant isolation & token-boundary security (@Tag for selective runs: -Dgroups=security) ──

    @Test
    @Tag("security")
    void crossTenant_jwtCannotFetchDemoProjectById() throws Exception {
        String demoToken = loginTenantAccessToken(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
        UUID demoProjectId = isolationFirstProjectId(demoToken);
        String intruderToken = registerAndLoginNewTenantAdmin();

        ResponseEntity<String> response = getWithBearer("/api/v1/project/projects/" + demoProjectId, intruderToken);

        assertThat(response.getStatusCode().value()).isIn(HttpStatus.NOT_FOUND.value(), HttpStatus.FORBIDDEN.value());
        assertBodyDoesNotLeakOnSuccess(response, DEMO_PROJECT_NAME);
    }

    @Test
    @Tag("security")
    void crossTenant_jwtCannotFetchDemoClientById() throws Exception {
        String intruderToken = registerAndLoginNewTenantAdmin();

        ResponseEntity<String> response = getWithBearer("/api/v1/crm/clients/" + DEMO_SEED_CLIENT_ID, intruderToken);

        assertThat(response.getStatusCode().value()).isIn(HttpStatus.NOT_FOUND.value(), HttpStatus.FORBIDDEN.value());
        assertBodyDoesNotLeakOnSuccess(response, DEMO_CLIENT_NAME_FRAGMENT);
    }

    @Test
    @Tag("security")
    void crossTenant_jwtCannotFetchDemoInvoiceById() throws Exception {
        String intruderToken = registerAndLoginNewTenantAdmin();

        ResponseEntity<String> response = getWithBearer("/api/v1/finance/invoices/" + DEMO_SEED_INVOICE_ID, intruderToken);

        assertThat(response.getStatusCode().value()).isIn(HttpStatus.NOT_FOUND.value(), HttpStatus.FORBIDDEN.value());
    }

    @Test
    @Tag("security")
    void crossTenant_jwtCannotFetchDemoEmployeeById() throws Exception {
        String intruderToken = registerAndLoginNewTenantAdmin();

        ResponseEntity<String> response = getWithBearer("/api/v1/hr/employees/" + DEMO_SEED_EMPLOYEE_ID, intruderToken);

        assertThat(response.getStatusCode().value()).isIn(HttpStatus.NOT_FOUND.value(), HttpStatus.FORBIDDEN.value());
        assertBodyDoesNotLeakOnSuccess(response, "Rajesh Krishnamurthy");
    }

    @Test
    @Tag("security")
    void crossTenant_projectList_doesNotIncludeDemoTenantProjectNames() throws Exception {
        String intruderToken = registerAndLoginNewTenantAdmin();

        ResponseEntity<String> response = getWithBearer("/api/v1/project/projects?page=0&size=50", intruderToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        String body = response.getBody() != null ? response.getBody() : "";
        assertThat(body).doesNotContain(DEMO_PROJECT_NAME).doesNotContain(DEMO_PROJECT_NAME_2);
    }

    @Test
    @Tag("security")
    void crossTenant_demoTenantCannotReadOtherTenantsClient() throws Exception {
        String intruderToken = registerAndLoginNewTenantAdmin();
        String secretName = "Isolation-Test-Client-" + UUID.randomUUID().toString().substring(0, 8);
        ResponseEntity<String> create = postJsonWithBearer(
                "/api/v1/crm/clients",
                """
                {"name":"%s","type":"company"}
                """.formatted(secretName),
                intruderToken);
        assertThat(create.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        JsonNode created = objectMapper.readTree(create.getBody());
        UUID otherClientId = UUID.fromString(created.path("data").path("id").asText());

        String demoToken = loginTenantAccessToken(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
        ResponseEntity<String> leakAttempt = getWithBearer("/api/v1/crm/clients/" + otherClientId, demoToken);

        assertThat(leakAttempt.getStatusCode().value()).isIn(HttpStatus.NOT_FOUND.value(), HttpStatus.FORBIDDEN.value());
        assertBodyDoesNotLeakOnSuccess(leakAttempt, secretName);
    }

    @Test
    @Tag("security")
    void platformJwt_cannotListTenantProjects() throws Exception {
        String platformToken = loginPlatformAccessToken(PLATFORM_EMAIL, PLATFORM_PASSWORD);

        ResponseEntity<String> response = getWithBearer("/api/v1/project/projects?page=0&size=5", platformToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @Tag("security")
    void tenantJwt_cannotListPlatformTenants() throws Exception {
        String demoToken = loginTenantAccessToken(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);

        ResponseEntity<String> response = getWithBearer("/api/v1/platform/tenants?page=0&size=5", demoToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @Tag("security")
    void tenantJwt_cannotAccessOtherTenantsProfileByTokenSwap() throws Exception {
        String demoToken = loginTenantAccessToken(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
        String intruderToken = registerAndLoginNewTenantAdmin();

        ResponseEntity<String> demoProfile = getWithBearer("/api/v1/tenant/profile", demoToken);
        assertThat(demoProfile.getStatusCode()).isEqualTo(HttpStatus.OK);
        String demoSlug = objectMapper.readTree(demoProfile.getBody()).path("data").path("subdomainSlug").asText();
        assertThat(demoSlug).isEqualTo("demo");

        ResponseEntity<String> intruderProfile = getWithBearer("/api/v1/tenant/profile", intruderToken);
        assertThat(intruderProfile.getStatusCode()).isEqualTo(HttpStatus.OK);
        String intruderSlug = objectMapper.readTree(intruderProfile.getBody()).path("data").path("subdomainSlug").asText();
        assertThat(intruderSlug).isNotEqualTo("demo");

        ResponseEntity<String> swapped = getWithBearer("/api/v1/tenant/profile", intruderToken);
        assertThat(objectMapper.readTree(swapped.getBody()).path("data").path("subdomainSlug").asText())
                .isEqualTo(intruderSlug);
    }

    private UUID isolationFirstProjectId(String tenantAccessToken) throws Exception {
        ResponseEntity<String> list = getWithBearer("/api/v1/project/projects?page=0&size=1", tenantAccessToken);
        assertThat(list.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode root = objectMapper.readTree(list.getBody());
        JsonNode first = root.path("data").get(0);
        assertThat(first).isNotNull();
        return UUID.fromString(first.path("id").asText());
    }

    private String registerAndLoginNewTenantAdmin() throws Exception {
        String slug = "iso-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String email = "admin+" + slug + "@example.com";
        String password = "IsoTestPassword1!";
        ResponseEntity<String> reg = postJson(
                "/api/v1/tenant",
                """
                {
                  "name": "Isolation Test Firm",
                  "subdomainSlug": "%s",
                  "adminEmail": "%s",
                  "adminName": "Iso Admin",
                  "adminPassword": "%s",
                  "plan": "starter"
                }
                """.formatted(slug, email, password));
        assertThat(reg.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return loginTenantAccessToken(email, password);
    }

    private static void assertBodyDoesNotLeakOnSuccess(ResponseEntity<String> response, String forbiddenSubstring) {
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            assertThat(response.getBody()).doesNotContain(forbiddenSubstring);
        }
    }
}
