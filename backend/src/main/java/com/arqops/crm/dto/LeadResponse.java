package com.arqops.crm.dto;

import com.arqops.crm.entity.Lead;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record LeadResponse(
        UUID id,
        UUID clientId,
        String title,
        String source,
        String projectType,
        BigDecimal estimatedValue,
        String stage,
        UUID stageId,
        String location,
        UUID assignedTo,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {
    public static LeadResponse from(Lead lead) {
        UUID clientId = lead.getClient() != null ? lead.getClient().getId() : null;
        return new LeadResponse(
                lead.getId(),
                clientId,
                lead.getTitle(),
                lead.getSource(),
                lead.getProjectType(),
                lead.getEstimatedValue(),
                lead.getStage(),
                lead.getStageId(),
                lead.getLocation(),
                lead.getAssignedTo(),
                lead.getNotes(),
                lead.getCreatedAt(),
                lead.getUpdatedAt()
        );
    }
}
