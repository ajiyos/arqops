package com.arqops.finance.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentRequest(
        @NotNull BigDecimal amount,
        @NotNull LocalDate paymentDate,
        String mode,
        String reference,
        String notes
) {}
