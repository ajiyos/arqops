package com.arqops.finance.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record VendorBillRequest(
        @NotNull UUID vendorId,
        UUID workOrderId,
        String billNumber,
        @NotNull BigDecimal amount,
        BigDecimal gstAmount,
        String tdsSection,
        BigDecimal tdsRate,
        BigDecimal tdsAmount,
        LocalDate dueDate,
        String status
) {}
