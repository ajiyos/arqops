package com.arqops.finance.dto;

import com.arqops.finance.entity.VendorBill;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record VendorBillResponse(
        UUID id,
        UUID vendorId,
        UUID workOrderId,
        String billNumber,
        BigDecimal amount,
        BigDecimal gstAmount,
        String tdsSection,
        BigDecimal tdsRate,
        BigDecimal tdsAmount,
        LocalDate dueDate,
        String status,
        Instant paidAt,
        Instant createdAt
) {
    public static VendorBillResponse from(VendorBill v) {
        return new VendorBillResponse(
                v.getId(),
                v.getVendorId(),
                v.getWorkOrderId(),
                v.getBillNumber(),
                v.getAmount(),
                v.getGstAmount(),
                v.getTdsSection(),
                v.getTdsRate(),
                v.getTdsAmount(),
                v.getDueDate(),
                v.getStatus(),
                v.getPaidAt(),
                v.getCreatedAt()
        );
    }
}
