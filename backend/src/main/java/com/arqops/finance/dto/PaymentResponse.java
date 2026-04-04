package com.arqops.finance.dto;

import com.arqops.finance.entity.Payment;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record PaymentResponse(
        UUID id,
        UUID invoiceId,
        BigDecimal amount,
        LocalDate paymentDate,
        String mode,
        String reference,
        String notes,
        Instant createdAt
) {
    public static PaymentResponse from(Payment p) {
        return new PaymentResponse(
                p.getId(),
                p.getInvoice().getId(),
                p.getAmount(),
                p.getPaymentDate(),
                p.getMode(),
                p.getReference(),
                p.getNotes(),
                p.getCreatedAt()
        );
    }
}
