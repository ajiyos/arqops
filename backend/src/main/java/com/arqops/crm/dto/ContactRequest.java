package com.arqops.crm.dto;

import jakarta.validation.constraints.NotBlank;

public record ContactRequest(
        @NotBlank String name,
        String designation,
        String email,
        String phone,
        String role
) {}
