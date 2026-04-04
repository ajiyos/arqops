package com.arqops.hr.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record LeaveRequestDto(
        @NotNull UUID employeeId,
        @NotNull UUID leaveTypeId,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @NotNull BigDecimal days,
        String reason
) {
}
