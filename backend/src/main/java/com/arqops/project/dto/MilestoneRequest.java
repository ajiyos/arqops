package com.arqops.project.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record MilestoneRequest(
        @NotBlank String name,
        LocalDate targetDate,
        LocalDate actualDate,
        String status,
        String deliverables
) {}
