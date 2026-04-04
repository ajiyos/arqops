package com.arqops.project.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record PhaseRequest(
        @NotBlank String name,
        Integer displayOrder,
        LocalDate startDate,
        LocalDate endDate
) {}
