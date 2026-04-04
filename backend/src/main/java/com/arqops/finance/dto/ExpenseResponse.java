package com.arqops.finance.dto;

import com.arqops.finance.entity.Expense;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ExpenseResponse(
        UUID id,
        UUID projectId,
        String category,
        BigDecimal amount,
        LocalDate expenseDate,
        String description,
        String receiptStorageKey,
        UUID createdBy,
        Instant createdAt
) {
    public static ExpenseResponse from(Expense e) {
        return new ExpenseResponse(
                e.getId(),
                e.getProjectId(),
                e.getCategory(),
                e.getAmount(),
                e.getExpenseDate(),
                e.getDescription(),
                e.getReceiptStorageKey(),
                e.getCreatedBy(),
                e.getCreatedAt()
        );
    }
}
