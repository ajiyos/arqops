package com.arqops.iam.dto;

import java.util.Map;

public record UpdateTenantProfileRequest(
        String name,
        String gstin,
        String pan,
        String address,
        String logoUrl,
        Map<String, Object> settings
) {}
