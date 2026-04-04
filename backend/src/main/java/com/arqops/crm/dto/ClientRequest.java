package com.arqops.crm.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;
import java.util.UUID;

public record ClientRequest(
        @NotBlank String name,
        String type,
        String gstin,
        String pan,
        Map<String, Object> billingAddress,
        String industrySegment,
        UUID createdBy
) {}
