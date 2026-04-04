package com.arqops.iam.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateTenantStatusRequest(
        @NotBlank String status
) {}
