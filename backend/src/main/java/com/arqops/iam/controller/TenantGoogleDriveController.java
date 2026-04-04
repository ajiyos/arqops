package com.arqops.iam.controller;

import com.arqops.common.config.GoogleDriveProperties;
import com.arqops.common.dto.ApiResponse;
import com.arqops.common.security.UserPrincipal;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.iam.dto.TenantResponse;
import com.arqops.iam.dto.UpdateTenantGoogleOAuthCredentialsRequest;
import com.arqops.iam.service.TenantGoogleDriveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tenant/storage/google")
@RequiredArgsConstructor
public class TenantGoogleDriveController {

    private final TenantGoogleDriveService tenantGoogleDriveService;
    private final GoogleDriveProperties googleDriveProperties;

    @GetMapping("/oauth-config")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> oauthConfig() {
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "redirectUri", googleDriveProperties.redirectUri())));
    }

    @PutMapping("/credentials")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<TenantResponse>> saveOAuthCredentials(
            @Valid @RequestBody UpdateTenantGoogleOAuthCredentialsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(tenantGoogleDriveService.saveOAuthCredentials(request)));
    }

    @GetMapping("/authorization-url")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> authorizationUrl(
            @AuthenticationPrincipal UserPrincipal principal) {
        String url = tenantGoogleDriveService.buildAuthorizationUrl(
                TenantContext.getCurrentTenantId(), principal.userId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("url", url)));
    }

    @GetMapping("/callback")
    public RedirectView oauthCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error) {
        if (StringUtils.hasText(error)) {
            String reason = sanitizeOAuthErrorReason(error);
            return new RedirectView(appendQueryParam(googleDriveProperties.oauthErrorRedirect(), "reason", reason));
        }
        if (!StringUtils.hasText(code) || !StringUtils.hasText(state)) {
            return new RedirectView(
                    appendQueryParam(googleDriveProperties.oauthErrorRedirect(), "reason", "missing_oauth_params"));
        }
        String target = tenantGoogleDriveService.handleOAuthCallback(code, state);
        return new RedirectView(target);
    }

    private static String sanitizeOAuthErrorReason(String error) {
        String s = error.trim().toLowerCase().replaceAll("[^a-z0-9_]+", "_");
        if (s.length() > 64) {
            s = s.substring(0, 64);
        }
        return "google_" + s;
    }

    private static String appendQueryParam(String base, String key, String value) {
        String sep = base.contains("?") ? "&" : "?";
        return base + sep + key + "=" + URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    @PostMapping("/disconnect")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> disconnect() {
        tenantGoogleDriveService.disconnect(TenantContext.getCurrentTenantId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
