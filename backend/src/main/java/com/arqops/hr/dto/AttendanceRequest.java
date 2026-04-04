package com.arqops.hr.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record AttendanceRequest(
        @NotNull UUID employeeId,
        @NotNull LocalDate date,
        @NotNull String status,
        LocalTime checkInTime,
        LocalTime checkOutTime,
        String notes
) {
}
