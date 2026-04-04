package com.arqops.vendor.dto;

import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record WorkOrderRequest(
        UUID vendorId,
        UUID projectId,
        @Size(max = 50) String woNumber,
        String scope,
        BigDecimal value,
        String paymentTerms,
        LocalDate startDate,
        LocalDate endDate,
        @Size(max = 20) String status
) {}
