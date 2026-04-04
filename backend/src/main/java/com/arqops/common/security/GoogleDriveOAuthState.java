package com.arqops.common.security;

import java.util.UUID;

public record GoogleDriveOAuthState(UUID tenantId, UUID userId) {}
