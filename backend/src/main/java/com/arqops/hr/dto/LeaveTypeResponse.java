package com.arqops.hr.dto;

import com.arqops.hr.entity.LeaveType;

import java.util.UUID;

public record LeaveTypeResponse(
        UUID id,
        String name,
        Integer annualQuota,
        Integer carryForwardLimit
) {
    public static LeaveTypeResponse from(LeaveType lt) {
        return new LeaveTypeResponse(lt.getId(), lt.getName(), lt.getAnnualQuota(), lt.getCarryForwardLimit());
    }
}
