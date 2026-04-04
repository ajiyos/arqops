package com.arqops.report.service;

import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.report.dto.DashboardResponse;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final EntityManager entityManager;

    public DashboardResponse buildDashboard(LocalDate from, LocalDate to) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            throw AppException.badRequest("Tenant context is required");
        }
        LocalDate startDate = from != null ? from : LocalDate.now().withDayOfMonth(1).minusMonths(11);
        LocalDate endDate = to != null ? to : LocalDate.now();

        long activeProjectCount = toLong(entityManager.createNativeQuery(
                        """
                                SELECT COUNT(*) FROM projects
                                WHERE tenant_id = :tenantId AND status = 'active' AND deleted_at IS NULL
                                """)
                .setParameter("tenantId", tenantId)
                .getSingleResult());

        BigDecimal pipelineValue = toBigDecimal(entityManager.createNativeQuery(
                        """
                                SELECT COALESCE(SUM(estimated_value), 0) FROM leads
                                WHERE tenant_id = :tenantId
                                  AND deleted_at IS NULL
                                  AND stage NOT IN ('Won', 'Lost')
                                """)
                .setParameter("tenantId", tenantId)
                .getSingleResult());

        BigDecimal invoiceTotal = toBigDecimal(entityManager.createNativeQuery(
                        """
                                SELECT COALESCE(SUM(total), 0) FROM invoices
                                WHERE tenant_id = :tenantId
                                  AND status IN ('sent', 'overdue')
                                  AND deleted_at IS NULL
                                """)
                .setParameter("tenantId", tenantId)
                .getSingleResult());

        BigDecimal paymentOnReceivables = toBigDecimal(entityManager.createNativeQuery(
                        """
                                SELECT COALESCE(SUM(p.amount), 0) FROM payments p
                                INNER JOIN invoices i ON i.id = p.invoice_id
                                WHERE p.tenant_id = :tenantId
                                  AND i.tenant_id = :tenantId
                                  AND i.status IN ('sent', 'overdue')
                                  AND p.deleted_at IS NULL
                                  AND i.deleted_at IS NULL
                                """)
                .setParameter("tenantId", tenantId)
                .getSingleResult());

        BigDecimal outstandingReceivables = invoiceTotal.subtract(paymentOnReceivables);

        BigDecimal pendingPayables = toBigDecimal(entityManager.createNativeQuery(
                        """
                                SELECT COALESCE(SUM(amount), 0) FROM vendor_bills
                                WHERE tenant_id = :tenantId AND status = 'pending' AND deleted_at IS NULL
                                """)
                .setParameter("tenantId", tenantId)
                .getSingleResult());

        long employeeCount = toLong(entityManager.createNativeQuery(
                        """
                                SELECT COUNT(*) FROM employees
                                WHERE tenant_id = :tenantId AND status = 'active' AND deleted_at IS NULL
                                """)
                .setParameter("tenantId", tenantId)
                .getSingleResult());

        long openLeadCount = toLong(entityManager.createNativeQuery(
                        """
                                SELECT COUNT(*) FROM leads
                                WHERE tenant_id = :tenantId AND deleted_at IS NULL
                                  AND stage NOT IN ('Won', 'Lost')
                                """)
                .setParameter("tenantId", tenantId)
                .getSingleResult());

        long overdueInvoiceCount = toLong(entityManager.createNativeQuery(
                        """
                                SELECT COUNT(*) FROM invoices
                                WHERE tenant_id = :tenantId AND deleted_at IS NULL
                                  AND status = 'overdue'
                                """)
                .setParameter("tenantId", tenantId)
                .getSingleResult());

        BigDecimal totalRevenue = toBigDecimal(entityManager.createNativeQuery(
                        """
                                SELECT COALESCE(SUM(total), 0) FROM invoices
                                WHERE tenant_id = :tenantId AND deleted_at IS NULL
                                  AND status != 'draft'
                                  AND date >= :startDate AND date <= :endDate
                                """)
                .setParameter("tenantId", tenantId)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getSingleResult());

        BigDecimal totalExpenses = toBigDecimal(entityManager.createNativeQuery(
                        """
                                SELECT COALESCE(SUM(amount), 0) FROM expenses
                                WHERE tenant_id = :tenantId AND deleted_at IS NULL
                                  AND date >= :startDate AND date <= :endDate
                                """)
                .setParameter("tenantId", tenantId)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getSingleResult());

        BigDecimal totalVendorCosts = toBigDecimal(entityManager.createNativeQuery(
                        """
                                SELECT COALESCE(SUM(amount), 0) FROM vendor_bills
                                WHERE tenant_id = :tenantId AND deleted_at IS NULL
                                  AND due_date >= :startDate AND due_date <= :endDate
                                """)
                .setParameter("tenantId", tenantId)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getSingleResult());

        long pendingLeaveRequests = toLong(entityManager.createNativeQuery(
                        """
                                SELECT COUNT(*) FROM leave_requests
                                WHERE tenant_id = :tenantId AND deleted_at IS NULL
                                  AND status = 'pending'
                                """)
                .setParameter("tenantId", tenantId)
                .getSingleResult());

        long activeVendorCount = toLong(entityManager.createNativeQuery(
                        """
                                SELECT COUNT(*) FROM vendors
                                WHERE tenant_id = :tenantId AND deleted_at IS NULL
                                  AND status = 'active'
                                """)
                .setParameter("tenantId", tenantId)
                .getSingleResult());

        return new DashboardResponse(
                activeProjectCount,
                pipelineValue,
                outstandingReceivables,
                pendingPayables,
                employeeCount,
                openLeadCount,
                overdueInvoiceCount,
                totalRevenue,
                totalExpenses,
                totalVendorCosts,
                pendingLeaveRequests,
                activeVendorCount
        );
    }

    private static long toLong(Object value) {
        if (value == null) return 0L;
        if (value instanceof Number n) return n.longValue();
        return Long.parseLong(value.toString());
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return new BigDecimal(value.toString());
    }
}
