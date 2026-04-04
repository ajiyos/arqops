package com.arqops.iam.service;

import com.arqops.common.config.GoogleDriveProperties;
import com.arqops.common.encryption.EncryptionService;
import com.arqops.common.exception.AppException;
import com.arqops.common.security.GoogleDriveOAuthState;
import com.arqops.common.security.JwtTokenProvider;
import com.arqops.common.storage.google.GoogleDriveAccessTokenProvider;
import com.arqops.common.storage.google.GoogleDriveRestApi;
import com.arqops.common.storage.google.GoogleOAuthTokenClient;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.iam.dto.TenantResponse;
import com.arqops.iam.dto.UpdateTenantGoogleOAuthCredentialsRequest;
import com.arqops.iam.entity.Tenant;
import com.arqops.iam.repository.TenantRepository;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantGoogleDriveService {

    private static final String SCOPE = "https://www.googleapis.com/auth/drive.file";

    private final GoogleDriveProperties properties;
    private final JwtTokenProvider jwtTokenProvider;
    private final GoogleOAuthTokenClient oauthTokenClient;
    private final GoogleDriveRestApi driveRestApi;
    private final EncryptionService encryptionService;
    private final TenantRepository tenantRepository;
    private final GoogleDriveAccessTokenProvider accessTokenProvider;

    public String buildAuthorizationUrl(UUID tenantId, UUID userId) {
        if (!properties.isCallbackConfigured()) {
            throw AppException.badRequest(
                    "OAuth callback URL is not configured on the server. Set GOOGLE_OAUTH_REDIRECT_URI to the exact "
                            + "URL each tenant registers in Google Cloud Console (e.g. https://api.example.com/api/v1/tenant/storage/google/callback).");
        }
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> AppException.notFound("Tenant", tenantId));
        if (!hasTenantOAuthCredentials(tenant)) {
            throw AppException.badRequest(
                    "Save this workspace's Google OAuth client ID and client secret before connecting Drive.");
        }
        String state = jwtTokenProvider.generateGoogleDriveOAuthState(tenantId, userId);
        return UriComponentsBuilder.fromUri(URI.create("https://accounts.google.com/o/oauth2/v2/auth"))
                .queryParam("client_id", tenant.getGoogleOauthClientId())
                .queryParam("redirect_uri", properties.redirectUri())
                .queryParam("response_type", "code")
                .queryParam("scope", SCOPE)
                .queryParam("access_type", "offline")
                .queryParam("prompt", "consent")
                .queryParam("state", state)
                .encode(StandardCharsets.UTF_8)
                .build()
                .toUriString();
    }

    @Transactional
    public String handleOAuthCallback(String code, String state) {
        try {
            GoogleDriveOAuthState parsed = jwtTokenProvider.parseGoogleDriveOAuthState(state);
            Tenant tenant = tenantRepository.findById(parsed.tenantId())
                    .orElseThrow(() -> AppException.notFound("Tenant", parsed.tenantId()));
            if (!hasTenantOAuthCredentials(tenant)) {
                return appendQuery(properties.oauthErrorRedirect(), "reason", "oauth_not_configured");
            }
            String clientSecret = encryptionService.decrypt(tenant.getGoogleOauthClientSecretEncrypted());
            GoogleOAuthTokenClient.TokenResponse tokens = oauthTokenClient.exchangeAuthorizationCode(
                    code, properties.redirectUri(), tenant.getGoogleOauthClientId(), clientSecret);
            if (tokens.refreshToken() == null || tokens.refreshToken().isBlank()) {
                return appendQuery(properties.oauthErrorRedirect(), "reason", "no_refresh_token");
            }
            String access = tokens.accessToken();
            String email = oauthTokenClient.fetchPrimaryEmail(access);
            String folderId = driveRestApi.createFolder(access, "ArqOps Files", "root");
            tenant.setGoogleRefreshTokenEncrypted(encryptionService.encrypt(tokens.refreshToken()));
            tenant.setGoogleRootFolderId(folderId);
            tenant.setGoogleConnectedEmail(email);
            tenant.setGoogleConnectedAt(Instant.now());
            tenantRepository.save(tenant);
            accessTokenProvider.invalidate(tenant.getId());
            return properties.oauthSuccessRedirect();
        } catch (AppException e) {
            return appendQuery(properties.oauthErrorRedirect(), "reason", "failed");
        } catch (JwtException e) {
            return appendQuery(properties.oauthErrorRedirect(), "reason", "invalid_state");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return appendQuery(properties.oauthErrorRedirect(), "reason", "interrupted");
        } catch (IOException e) {
            return appendQuery(properties.oauthErrorRedirect(), "reason", "exchange_failed");
        }
    }

    @Transactional
    public TenantResponse saveOAuthCredentials(UpdateTenantGoogleOAuthCredentialsRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> AppException.notFound("Tenant", tenantId));

        boolean secretUpdate = request.clientSecret() != null && !request.clientSecret().isBlank();
        if (!secretUpdate && (tenant.getGoogleOauthClientSecretEncrypted() == null
                || tenant.getGoogleOauthClientSecretEncrypted().isBlank())) {
            throw AppException.badRequest("Google OAuth client secret is required on first setup");
        }

        String trimmedId = request.clientId().trim();
        String oldClientId = tenant.getGoogleOauthClientId();
        tenant.setGoogleOauthClientId(trimmedId);
        if (secretUpdate) {
            tenant.setGoogleOauthClientSecretEncrypted(encryptionService.encrypt(request.clientSecret().trim()));
        }

        boolean hadDrive = tenant.getGoogleRefreshTokenEncrypted() != null
                && !tenant.getGoogleRefreshTokenEncrypted().isBlank();
        if (hadDrive) {
            boolean idChanged = oldClientId == null || !oldClientId.equals(trimmedId);
            if (idChanged || secretUpdate) {
                clearDriveSession(tenant);
                accessTokenProvider.invalidate(tenantId);
            }
        }

        tenant = tenantRepository.save(tenant);
        return TenantResponse.from(tenant);
    }

    private static void clearDriveSession(Tenant t) {
        t.setGoogleRefreshTokenEncrypted(null);
        t.setGoogleRootFolderId(null);
        t.setGoogleConnectedAt(null);
        t.setGoogleConnectedEmail(null);
    }

    private static boolean hasTenantOAuthCredentials(Tenant t) {
        return t.getGoogleOauthClientId() != null && !t.getGoogleOauthClientId().isBlank()
                && t.getGoogleOauthClientSecretEncrypted() != null
                && !t.getGoogleOauthClientSecretEncrypted().isBlank();
    }

    private static String appendQuery(String base, String key, String value) {
        String sep = base.contains("?") ? "&" : "?";
        return base + sep + key + "=" + URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    @Transactional
    public void disconnect(UUID tenantId) {
        Tenant t = tenantRepository.findById(tenantId)
                .orElseThrow(() -> AppException.notFound("Tenant", tenantId));
        t.setGoogleRefreshTokenEncrypted(null);
        t.setGoogleRootFolderId(null);
        t.setGoogleConnectedAt(null);
        t.setGoogleConnectedEmail(null);
        tenantRepository.save(t);
        accessTokenProvider.invalidate(tenantId);
    }
}
