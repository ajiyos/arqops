package com.arqops.hr.dto;

import com.arqops.hr.entity.Employee;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

public record EmployeeResponse(
        UUID id,
        UUID userId,
        String userEmail,
        String userName,
        String employeeCode,
        String name,
        String designation,
        String department,
        LocalDate dateOfJoining,
        UUID reportingManagerId,
        Map<String, Object> salaryStructureJson,
        String phone,
        String personalEmail,
        String emergencyContactName,
        String emergencyContactPhone,
        String emergencyContactRelation,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static EmployeeResponse from(Employee e, String userEmail, String userName) {
        return new EmployeeResponse(
                e.getId(),
                e.getUserId(),
                userEmail,
                userName,
                e.getEmployeeCode(),
                e.getName(),
                e.getDesignation(),
                e.getDepartment(),
                e.getDateOfJoining(),
                e.getReportingManagerId(),
                e.getSalaryStructureJson(),
                e.getPhone(),
                e.getPersonalEmail(),
                e.getEmergencyContactName(),
                e.getEmergencyContactPhone(),
                e.getEmergencyContactRelation(),
                e.getStatus(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }

    public static EmployeeResponse from(Employee e) {
        return from(e, null, null);
    }
}
