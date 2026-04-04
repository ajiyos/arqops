package com.arqops.project.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ProjectRequest(
        UUID clientId,
        UUID leadId,
        @NotBlank String name,
        String type,
        String location,
        String siteAddress,
        LocalDate startDate,
        LocalDate targetEndDate,
        BigDecimal value,
        String status,
        @Valid List<PhaseInput> phases
) {
    public record PhaseInput(
            @NotBlank String name,
            Integer displayOrder,
            LocalDate startDate,
            LocalDate endDate,
            @Valid List<@NotNull MilestoneInput> milestones
    ) {}

    public record MilestoneInput(
            @NotBlank String name,
            LocalDate targetDate,
            LocalDate actualDate,
            String status,
            String deliverables
    ) {}
}
