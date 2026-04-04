package com.arqops.crm.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.UUID;

public record LeadRequest(
        UUID clientId,
        @NotBlank String title,
        String source,
        String projectType,
        BigDecimal estimatedValue,
        String stage,
        UUID stageId,
        String location,
        UUID assignedTo,
        String notes
) {}
