package com.arqops.iam.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateTenantRequest(
        @NotBlank String name,
        @NotBlank @Pattern(regexp = "^[a-z0-9-]+$") String subdomainSlug,
        @NotBlank @Email String adminEmail,
        @NotBlank String adminName,
        @NotBlank String adminPassword,
        String plan
) {}
