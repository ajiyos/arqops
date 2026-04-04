package com.arqops.finance.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record InvoiceRequest(
        @NotNull UUID clientId,
        UUID projectId,
        /** Ignored on create (server assigns INV-{year}-####); required on update. */
        String invoiceNumber,
        @NotNull LocalDate invoiceDate,
        @NotNull LocalDate dueDate,
        JsonNode lineItemsJson,
        String sacCode,
        BigDecimal cgst,
        BigDecimal sgst,
        BigDecimal igst,
        @NotNull BigDecimal total,
        String status
) {}
