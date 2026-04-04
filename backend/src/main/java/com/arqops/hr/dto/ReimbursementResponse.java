package com.arqops.hr.dto;

import com.arqops.hr.entity.Reimbursement;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ReimbursementResponse(
        UUID id,
        UUID employeeId,
        String category,
        BigDecimal amount,
        String description,
        String receiptStorageKey,
        String status,
        UUID approvedBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static ReimbursementResponse from(Reimbursement r) {
        return new ReimbursementResponse(
                r.getId(),
                r.getEmployeeId(),
                r.getCategory(),
                r.getAmount(),
                r.getDescription(),
                r.getReceiptStorageKey(),
                r.getStatus(),
                r.getApprovedBy(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}
