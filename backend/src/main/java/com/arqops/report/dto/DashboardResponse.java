package com.arqops.report.dto;

import java.math.BigDecimal;

public record DashboardResponse(
        long activeProjectCount,
        BigDecimal pipelineValue,
        BigDecimal outstandingReceivables,
        BigDecimal pendingPayables,
        long employeeCount,
        long openLeadCount,
        long overdueInvoiceCount,
        BigDecimal totalRevenue,
        BigDecimal totalExpenses,
        BigDecimal totalVendorCosts,
        long pendingLeaveRequests,
        long activeVendorCount
) {
}
