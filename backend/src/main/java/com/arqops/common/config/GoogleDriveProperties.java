package com.arqops.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Platform-level Google OAuth URLs only. Each tenant stores their own OAuth client ID and secret.
 */
@ConfigurationProperties(prefix = "app.google")
public record GoogleDriveProperties(
        String redirectUri,
        String oauthSuccessRedirect,
        String oauthErrorRedirect
) {
    public GoogleDriveProperties {
        redirectUri = nullToEmpty(redirectUri);
        oauthSuccessRedirect = nullToEmpty(oauthSuccessRedirect);
        oauthErrorRedirect = nullToEmpty(oauthErrorRedirect);
    }

    private static String nullToEmpty(String s) {
        return s != null ? s : "";
    }

    public boolean isCallbackConfigured() {
        return !redirectUri.isBlank();
    }
}
