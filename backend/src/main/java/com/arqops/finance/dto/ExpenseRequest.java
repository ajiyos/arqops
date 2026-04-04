package com.arqops.finance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ExpenseRequest(
        UUID projectId,
        @NotBlank String category,
        @NotNull BigDecimal amount,
        @NotNull LocalDate expenseDate,
        String description,
        String receiptStorageKey
) {}
