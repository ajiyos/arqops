package com.arqops.finance.dto;

import com.arqops.finance.entity.Invoice;
import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record InvoiceResponse(
        UUID id,
        UUID clientId,
        UUID projectId,
        String invoiceNumber,
        LocalDate invoiceDate,
        LocalDate dueDate,
        JsonNode lineItemsJson,
        String sacCode,
        BigDecimal cgst,
        BigDecimal sgst,
        BigDecimal igst,
        BigDecimal total,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static InvoiceResponse from(Invoice i) {
        return new InvoiceResponse(
                i.getId(),
                i.getClientId(),
                i.getProjectId(),
                i.getInvoiceNumber(),
                i.getInvoiceDate(),
                i.getDueDate(),
                i.getLineItemsJson(),
                i.getSacCode(),
                i.getCgst(),
                i.getSgst(),
                i.getIgst(),
                i.getTotal(),
                i.getStatus(),
                i.getCreatedAt(),
                i.getUpdatedAt()
        );
    }
}
