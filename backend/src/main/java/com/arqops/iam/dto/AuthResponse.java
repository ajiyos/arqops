package com.arqops.iam.dto;

import java.util.List;
import java.util.UUID;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        UUID userId,
        UUID tenantId,
        String name,
        String email,
        List<String> roles,
        List<String> permissions
) {}
