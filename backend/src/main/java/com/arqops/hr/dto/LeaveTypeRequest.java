package com.arqops.hr.dto;

import jakarta.validation.constraints.NotBlank;

public record LeaveTypeRequest(
        @NotBlank String name,
        Integer annualQuota,
        Integer carryForwardLimit
) {}
