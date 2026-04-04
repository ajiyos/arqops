package com.arqops.crm.dto;

import com.arqops.crm.entity.Client;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ClientResponse(
        UUID id,
        String name,
        String type,
        String gstin,
        String pan,
        Map<String, Object> billingAddress,
        String industrySegment,
        UUID createdBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static ClientResponse from(Client c) {
        return new ClientResponse(
                c.getId(),
                c.getName(),
                c.getType(),
                c.getGstin(),
                c.getPan(),
                c.getBillingAddress(),
                c.getIndustrySegment(),
                c.getCreatedBy(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
