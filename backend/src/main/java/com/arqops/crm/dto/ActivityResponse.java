package com.arqops.crm.dto;

import com.arqops.crm.entity.Activity;

import java.time.Instant;
import java.util.UUID;

public record ActivityResponse(
        UUID id,
        String entityType,
        UUID entityId,
        String type,
        String description,
        Instant date,
        UUID assignedTo,
        Instant createdAt,
        Instant updatedAt
) {
    public static ActivityResponse from(Activity a) {
        return new ActivityResponse(
                a.getId(),
                a.getEntityType(),
                a.getEntityId(),
                a.getType(),
                a.getDescription(),
                a.getDate(),
                a.getAssignedTo(),
                a.getCreatedAt(),
                a.getUpdatedAt()
        );
    }
}
