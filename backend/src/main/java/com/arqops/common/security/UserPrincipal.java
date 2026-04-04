package com.arqops.common.security;

import java.util.List;
import java.util.UUID;

public record UserPrincipal(
        UUID userId,
        UUID tenantId,
        String email,
        List<String> roles
) {}
