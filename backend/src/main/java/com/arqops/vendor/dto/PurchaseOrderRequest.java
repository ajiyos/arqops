package com.arqops.vendor.dto;

import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

public record PurchaseOrderRequest(
        UUID workOrderId,
        @Size(max = 50) String poNumber,
        Map<String, Object> lineItems,
        BigDecimal gstAmount,
        BigDecimal total,
        @Size(max = 20) String status
) {}
