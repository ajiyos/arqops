package com.arqops.iam.dto;

import java.util.UUID;

public record PlatformAuthResponse(
        String accessToken,
        String refreshToken,
        UUID userId,
        String name,
        String email
) {}
