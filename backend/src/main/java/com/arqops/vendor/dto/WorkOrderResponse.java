package com.arqops.vendor.dto;

import com.arqops.vendor.entity.WorkOrder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record WorkOrderResponse(
        UUID id,
        UUID vendorId,
        String vendorName,
        UUID projectId,
        String woNumber,
        String scope,
        BigDecimal value,
        String paymentTerms,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        UUID approvedBy,
        Instant approvedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static WorkOrderResponse from(WorkOrder w) {
        return new WorkOrderResponse(
                w.getId(),
                w.getVendor().getId(),
                w.getVendor().getName(),
                w.getProjectId(),
                w.getWoNumber(),
                w.getScope(),
                w.getValue(),
                w.getPaymentTerms(),
                w.getStartDate(),
                w.getEndDate(),
                w.getStatus(),
                w.getApprovedBy(),
                w.getApprovedAt(),
                w.getCreatedAt(),
                w.getUpdatedAt());
    }
}
