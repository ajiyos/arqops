package com.arqops.iam.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Tenant-scoped Google OAuth web client credentials. The client secret may be omitted on update
 * to keep the existing encrypted secret; the first save must include a non-blank secret.
 */
public record UpdateTenantGoogleOAuthCredentialsRequest(
        @NotBlank @Size(max = 512) String clientId,
        @Size(max = 512) String clientSecret
) {}
