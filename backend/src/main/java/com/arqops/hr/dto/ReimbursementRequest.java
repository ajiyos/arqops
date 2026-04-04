package com.arqops.hr.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record ReimbursementRequest(
        @NotNull UUID employeeId,
        @NotBlank String category,
        @NotNull BigDecimal amount,
        String description,
        String receiptStorageKey
) {
}
