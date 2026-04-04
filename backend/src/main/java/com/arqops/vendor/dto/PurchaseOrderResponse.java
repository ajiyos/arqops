package com.arqops.vendor.dto;

import com.arqops.vendor.entity.PurchaseOrder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record PurchaseOrderResponse(
        UUID id,
        UUID workOrderId,
        String poNumber,
        Map<String, Object> lineItems,
        BigDecimal gstAmount,
        BigDecimal total,
        String status,
        UUID approvedBy,
        Instant approvedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static PurchaseOrderResponse from(PurchaseOrder p) {
        UUID woId = p.getWorkOrder() != null ? p.getWorkOrder().getId() : null;
        return new PurchaseOrderResponse(
                p.getId(),
                woId,
                p.getPoNumber(),
                p.getLineItems(),
                p.getGstAmount(),
                p.getTotal(),
                p.getStatus(),
                p.getApprovedBy(),
                p.getApprovedAt(),
                p.getCreatedAt(),
                p.getUpdatedAt());
    }
}
