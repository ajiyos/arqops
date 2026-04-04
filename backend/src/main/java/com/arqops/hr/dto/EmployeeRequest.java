package com.arqops.hr.dto;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

public record EmployeeRequest(
        UUID userId,
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
        String pan,
        String status
) {
}
