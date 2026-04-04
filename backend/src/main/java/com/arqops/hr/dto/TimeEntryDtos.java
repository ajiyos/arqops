package com.arqops.hr.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class TimeEntryDtos {

    private TimeEntryDtos() {}

    public record EntryResponse(
            UUID id,
            UUID employeeId,
            UUID projectId,
            LocalDate workDate,
            BigDecimal hours,
            boolean billable,
            String notes) {

        public static EntryResponse from(com.arqops.hr.entity.TimeEntry e) {
            return new EntryResponse(
                    e.getId(),
                    e.getEmployeeId(),
                    e.getProjectId(),
                    e.getWorkDate(),
                    e.getHours(),
                    e.isBillable(),
                    e.getNotes());
        }
    }

    public record EntryItem(
            @NotNull LocalDate workDate,
            UUID projectId,
            @NotNull @DecimalMin(value = "0.01", inclusive = true) BigDecimal hours,
            boolean billable,
            String notes) {}

    public record SyncRequest(
            @NotNull LocalDate from,
            @NotNull LocalDate to,
            UUID employeeId,
            @Valid List<EntryItem> entries) {
        public SyncRequest {
            entries = entries != null ? entries : List.of();
        }
    }
}
