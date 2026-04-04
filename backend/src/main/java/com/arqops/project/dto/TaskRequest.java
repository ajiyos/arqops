package com.arqops.project.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.UUID;

public record TaskRequest(
        UUID milestoneId,
        @NotBlank String title,
        String description,
        UUID assigneeId,
        String priority,
        String status,
        LocalDate dueDate
) {}
