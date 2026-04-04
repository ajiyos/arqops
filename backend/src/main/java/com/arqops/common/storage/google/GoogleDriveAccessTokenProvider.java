package com.arqops.common.storage.google;

import com.arqops.common.encryption.EncryptionService;
import com.arqops.common.exception.AppException;
import org.springframework.util.Assert;
import com.arqops.iam.entity.Tenant;
import com.arqops.iam.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class GoogleDriveAccessTokenProvider {

    private final TenantRepository tenantRepository;
    private final EncryptionService encryptionService;
    private final GoogleOAuthTokenClient oauthTokenClient;

    private static final int MAX_CACHED_TENANTS = 512;

    private final ConcurrentHashMap<UUID, CachedAccess> cache = new ConcurrentHashMap<>();

    public String requireAccessToken(UUID tenantId) {
        Assert.notNull(tenantId, "tenantId");
        CachedAccess cached = cache.get(tenantId);
        if (cached != null && Instant.now().isBefore(cached.validUntil())) {
            return cached.token();
        }
        Tenant t = tenantRepository.findById(tenantId)
                .orElseThrow(() -> AppException.notFound("Tenant", tenantId));
        if (t.getGoogleRefreshTokenEncrypted() == null || t.getGoogleRefreshTokenEncrypted().isBlank()) {
            throw AppException.forbidden("Google Drive is not connected for this workspace");
        }
        if (t.getGoogleOauthClientId() == null || t.getGoogleOauthClientId().isBlank()
                || t.getGoogleOauthClientSecretEncrypted() == null
                || t.getGoogleOauthClientSecretEncrypted().isBlank()) {
            throw AppException.forbidden("Google OAuth credentials are missing for this workspace");
        }
        String refreshPlain = encryptionService.decrypt(t.getGoogleRefreshTokenEncrypted());
        String clientSecret = encryptionService.decrypt(t.getGoogleOauthClientSecretEncrypted());
        try {
            GoogleOAuthTokenClient.TokenResponse tr = oauthTokenClient.refreshAccessToken(
                    refreshPlain, t.getGoogleOauthClientId(), clientSecret);
            long skew = 90;
            Instant validUntil = Instant.now().plusSeconds(Math.max(120, tr.expiresInSeconds()) - skew);
            trimTokenCacheIfNeeded();
            cache.put(tenantId, new CachedAccess(tr.accessToken(), validUntil));
            return tr.accessToken();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw AppException.badRequest("Interrupted while refreshing Google token");
        } catch (IOException e) {
            throw AppException.badRequest("Could not refresh Google access token");
        }
    }

    public void invalidate(UUID tenantId) {
        cache.remove(tenantId);
    }

    /** Drop expired entries; if still over cap (pathological many tenants), clear to avoid unbounded RAM. */
    private void trimTokenCacheIfNeeded() {
        if (cache.size() < MAX_CACHED_TENANTS) {
            return;
        }
        Instant now = Instant.now();
        cache.entrySet().removeIf(e -> !now.isBefore(e.getValue().validUntil()));
        if (cache.size() >= MAX_CACHED_TENANTS) {
            cache.clear();
        }
    }

    private record CachedAccess(String token, Instant validUntil) {}
}
