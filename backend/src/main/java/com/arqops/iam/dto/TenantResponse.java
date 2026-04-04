package com.arqops.iam.dto;

import com.arqops.iam.entity.Tenant;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record TenantResponse(
        UUID id,
        String name,
        String subdomainSlug,
        String plan,
        String status,
        String gstin,
        String pan,
        String address,
        String logoUrl,
        Map<String, Object> settings,
        Instant createdAt,
        boolean googleDriveConnected,
        String googleDriveConnectedEmail,
        String googleOauthClientId,
        boolean googleDriveOauthConfigured
) {
    public static TenantResponse from(Tenant t) {
        boolean drive = t.getGoogleRefreshTokenEncrypted() != null && !t.getGoogleRefreshTokenEncrypted().isBlank()
                && t.getGoogleRootFolderId() != null && !t.getGoogleRootFolderId().isBlank();
        boolean oauthConfigured = t.getGoogleOauthClientId() != null && !t.getGoogleOauthClientId().isBlank()
                && t.getGoogleOauthClientSecretEncrypted() != null
                && !t.getGoogleOauthClientSecretEncrypted().isBlank();
        return new TenantResponse(
                t.getId(), t.getName(), t.getSubdomainSlug(), t.getPlan(),
                t.getStatus(), t.getGstin(), t.getPan(), t.getAddress(),
                t.getLogoUrl(), t.getSettings(), t.getCreatedAt(),
                drive,
                drive ? t.getGoogleConnectedEmail() : null,
                t.getGoogleOauthClientId(),
                oauthConfigured
        );
    }
}
