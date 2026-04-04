package com.arqops.iam.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record RoleRequest(
        @NotBlank String name,
        List<String> permissions
) {}
