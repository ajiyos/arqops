package com.arqops.hr.dto;

import com.arqops.hr.entity.Attendance;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record AttendanceResponse(
        UUID id,
        UUID employeeId,
        LocalDate date,
        String status,
        LocalTime checkInTime,
        LocalTime checkOutTime,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {
    public static AttendanceResponse from(Attendance a) {
        return new AttendanceResponse(
                a.getId(),
                a.getEmployeeId(),
                a.getAttendanceDate(),
                a.getStatus(),
                a.getCheckInTime(),
                a.getCheckOutTime(),
                a.getNotes(),
                a.getCreatedAt(),
                a.getUpdatedAt()
        );
    }
}
