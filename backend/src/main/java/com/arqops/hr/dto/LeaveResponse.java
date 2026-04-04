package com.arqops.hr.dto;

import com.arqops.hr.entity.LeaveRequest;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record LeaveResponse(
        UUID id,
        UUID employeeId,
        UUID leaveTypeId,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal days,
        String reason,
        String status,
        UUID approvedBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static LeaveResponse from(LeaveRequest lr) {
        return new LeaveResponse(
                lr.getId(),
                lr.getEmployeeId(),
                lr.getLeaveTypeId(),
                lr.getStartDate(),
                lr.getEndDate(),
                lr.getDays(),
                lr.getReason(),
                lr.getStatus(),
                lr.getApprovedBy(),
                lr.getCreatedAt(),
                lr.getUpdatedAt()
        );
    }
}
