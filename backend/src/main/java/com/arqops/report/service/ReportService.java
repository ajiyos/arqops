package com.arqops.report.service;

import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.report.dto.ReportRow;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> crmPipeline() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT COALESCE(stage, 'Unknown') AS stage,
                       COUNT(*)                   AS lead_count,
                       COALESCE(SUM(estimated_value), 0) AS total_value
                FROM leads
                WHERE tenant_id = :tid AND deleted_at IS NULL
                GROUP BY stage ORDER BY lead_count DESC
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[0]),
                Map.of("leadCount", toLong(r[1]), "totalValue", toBd(r[2]))
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> leadSourceAnalysis() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT COALESCE(source, 'Unknown') AS source,
                       COUNT(*) AS lead_count,
                       COALESCE(SUM(estimated_value), 0) AS total_value,
                       COUNT(*) FILTER (WHERE stage = 'Won') AS won_count
                FROM leads
                WHERE tenant_id = :tid AND deleted_at IS NULL
                GROUP BY source ORDER BY lead_count DESC
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[0]),
                Map.of("leadCount", toLong(r[1]), "totalValue", toBd(r[2]), "wonCount", toLong(r[3]))
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> projectStatus() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT p.name, p.status, p.start_date, p.target_end_date,
                       COALESCE(p.value, 0),
                       (SELECT COUNT(*) FROM project_phases ph WHERE ph.project_id = p.id AND ph.deleted_at IS NULL),
                       (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.deleted_at IS NULL),
                       (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done' AND t.deleted_at IS NULL)
                FROM projects p
                WHERE p.tenant_id = :tid AND p.deleted_at IS NULL
                ORDER BY p.status, p.name
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[0]),
                Map.of(
                        "status", str(r[1]),
                        "startDate", str(r[2]),
                        "targetEndDate", str(r[3]),
                        "value", toBd(r[4]),
                        "phases", toLong(r[5]),
                        "totalTasks", toLong(r[6]),
                        "completedTasks", toLong(r[7])
                )
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> budgetVariance() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT p.name,
                       COALESCE(SUM(bl.budgeted_amount), 0) AS total_budgeted,
                       COALESCE(SUM(bl.actual_amount), 0) AS total_actual,
                       COALESCE(SUM(bl.budgeted_amount), 0) - COALESCE(SUM(bl.actual_amount), 0) AS variance
                FROM projects p
                LEFT JOIN project_budget_lines bl ON bl.project_id = p.id AND bl.deleted_at IS NULL
                WHERE p.tenant_id = :tid AND p.deleted_at IS NULL
                GROUP BY p.id, p.name
                HAVING COALESCE(SUM(bl.budgeted_amount), 0) > 0
                ORDER BY variance ASC
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[0]),
                Map.of("totalBudgeted", toBd(r[1]), "totalActual", toBd(r[2]), "variance", toBd(r[3]))
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> receivablesAging() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT i.invoice_number,
                       (SELECT c.name FROM clients c WHERE c.id = i.client_id),
                       i.total,
                       COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id AND p.deleted_at IS NULL), 0) AS paid,
                       i.total - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id AND p.deleted_at IS NULL), 0) AS outstanding,
                       i.due_date,
                       CURRENT_DATE - i.due_date AS days_overdue,
                       i.status
                FROM invoices i
                WHERE i.tenant_id = :tid
                  AND i.status IN ('sent', 'overdue', 'partial')
                  AND i.deleted_at IS NULL
                ORDER BY (CURRENT_DATE - i.due_date) DESC
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> {
            int daysOverdue = toInt(r[6]);
            String bucket = daysOverdue <= 0 ? "Current" : daysOverdue <= 30 ? "1-30 days" : daysOverdue <= 60 ? "31-60 days" : daysOverdue <= 90 ? "61-90 days" : "90+ days";
            return new ReportRow(
                    str(r[0]),
                    Map.of(
                            "client", str(r[1]),
                            "total", toBd(r[2]),
                            "paid", toBd(r[3]),
                            "outstanding", toBd(r[4]),
                            "dueDate", str(r[5]),
                            "daysOverdue", daysOverdue,
                            "bucket", bucket,
                            "status", str(r[7])
                    )
            );
        }).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> payablesAging() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT vb.bill_number,
                       (SELECT v.name FROM vendors v WHERE v.id = vb.vendor_id),
                       vb.amount, vb.gst_amount, vb.tds_amount,
                       vb.due_date,
                       CASE WHEN vb.due_date IS NOT NULL THEN CURRENT_DATE - vb.due_date ELSE 0 END AS days_overdue,
                       vb.status
                FROM vendor_bills vb
                WHERE vb.tenant_id = :tid
                  AND vb.status IN ('pending', 'approved')
                  AND vb.deleted_at IS NULL
                ORDER BY days_overdue DESC
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> {
            int daysOverdue = toInt(r[6]);
            String bucket = daysOverdue <= 0 ? "Current" : daysOverdue <= 30 ? "1-30 days" : daysOverdue <= 60 ? "31-60 days" : daysOverdue <= 90 ? "61-90 days" : "90+ days";
            return new ReportRow(
                    str(r[0]),
                    Map.of(
                            "vendor", str(r[1]),
                            "amount", toBd(r[2]),
                            "gstAmount", toBd(r[3]),
                            "tdsAmount", toBd(r[4]),
                            "dueDate", str(r[5]),
                            "daysOverdue", daysOverdue,
                            "bucket", bucket,
                            "status", str(r[7])
                    )
            );
        }).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> attendanceSummary(LocalDate from, LocalDate to) {
        UUID tenantId = requireTenant();
        LocalDate startDate = from != null ? from : LocalDate.now().withDayOfMonth(1);
        LocalDate endDate = to != null ? to : LocalDate.now();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT e.name, e.employee_code,
                       COUNT(*) FILTER (WHERE a.status = 'PRESENT') AS present_days,
                       COUNT(*) FILTER (WHERE a.status = 'ABSENT') AS absent_days,
                       COUNT(*) FILTER (WHERE a.status = 'HALF_DAY') AS half_days,
                       COUNT(*) FILTER (WHERE a.status = 'ON_LEAVE') AS on_leave_days,
                       COUNT(*) AS total_records
                FROM employees e
                LEFT JOIN attendance a ON a.employee_id = e.id
                    AND a.tenant_id = :tid
                    AND a.deleted_at IS NULL
                    AND a.date >= :startDate
                    AND a.date <= :endDate
                WHERE e.tenant_id = :tid AND e.status = 'active' AND e.deleted_at IS NULL
                GROUP BY e.id, e.name, e.employee_code
                ORDER BY e.name
                """)
                .setParameter("tid", tenantId)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[0]),
                Map.of(
                        "employeeCode", str(r[1]),
                        "presentDays", toLong(r[2]),
                        "absentDays", toLong(r[3]),
                        "halfDays", toLong(r[4]),
                        "onLeaveDays", toLong(r[5]),
                        "totalRecords", toLong(r[6])
                )
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> leaveSummary() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT e.name, e.employee_code,
                       COUNT(*) FILTER (WHERE lr.status = 'approved') AS approved_leaves,
                       COUNT(*) FILTER (WHERE lr.status = 'pending') AS pending_leaves,
                       COUNT(*) FILTER (WHERE lr.status = 'rejected') AS rejected_leaves,
                       COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.days ELSE 0 END), 0) AS total_days
                FROM employees e
                LEFT JOIN leave_requests lr ON lr.employee_id = e.id
                    AND lr.tenant_id = :tid AND lr.deleted_at IS NULL
                WHERE e.tenant_id = :tid AND e.status = 'active' AND e.deleted_at IS NULL
                GROUP BY e.id, e.name, e.employee_code
                ORDER BY total_days DESC
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[0]),
                Map.of(
                        "employeeCode", str(r[1]),
                        "approvedLeaves", toLong(r[2]),
                        "pendingLeaves", toLong(r[3]),
                        "rejectedLeaves", toLong(r[4]),
                        "totalDays", toBd(r[5])
                )
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> revenueExpenses(LocalDate from, LocalDate to) {
        UUID tenantId = requireTenant();
        LocalDate startDate = from != null ? from : LocalDate.now().minusMonths(5).withDayOfMonth(1);
        LocalDate endDate = to != null ? to : LocalDate.now();
        List<Object[]> rows = entityManager.createNativeQuery("""
                WITH months AS (
                    SELECT generate_series(:startDate::date, :endDate::date, '1 month')::date AS month_start
                ),
                inv AS (
                    SELECT DATE_TRUNC('month', date)::date AS m, COALESCE(SUM(total), 0) AS revenue
                    FROM invoices
                    WHERE tenant_id = :tid AND deleted_at IS NULL AND status != 'draft'
                    GROUP BY m
                ),
                exp AS (
                    SELECT DATE_TRUNC('month', date)::date AS m, COALESCE(SUM(amount), 0) AS expenses
                    FROM expenses
                    WHERE tenant_id = :tid AND deleted_at IS NULL
                    GROUP BY m
                ),
                bills AS (
                    SELECT DATE_TRUNC('month', due_date)::date AS m, COALESCE(SUM(amount), 0) AS vendor_costs
                    FROM vendor_bills
                    WHERE tenant_id = :tid AND deleted_at IS NULL
                    GROUP BY m
                )
                SELECT TO_CHAR(months.month_start, 'Mon YYYY'),
                       COALESCE(inv.revenue, 0),
                       COALESCE(exp.expenses, 0),
                       COALESCE(bills.vendor_costs, 0)
                FROM months
                LEFT JOIN inv ON inv.m = months.month_start
                LEFT JOIN exp ON exp.m = months.month_start
                LEFT JOIN bills ON bills.m = months.month_start
                ORDER BY months.month_start
                """)
                .setParameter("tid", tenantId)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[0]),
                Map.of(
                        "revenue", toBd(r[1]),
                        "expenses", toBd(r[2]),
                        "vendorCosts", toBd(r[3])
                )
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> gstSummary(LocalDate from, LocalDate to) {
        UUID tenantId = requireTenant();
        LocalDate startDate = from != null ? from : LocalDate.now().minusMonths(5).withDayOfMonth(1);
        LocalDate endDate = to != null ? to : LocalDate.now();
        List<Object[]> rows = entityManager.createNativeQuery("""
                WITH months AS (
                    SELECT generate_series(:startDate::date, :endDate::date, '1 month')::date AS month_start
                ),
                output_gst AS (
                    SELECT DATE_TRUNC('month', date)::date AS m,
                           COALESCE(SUM(cgst), 0) AS cgst,
                           COALESCE(SUM(sgst), 0) AS sgst,
                           COALESCE(SUM(igst), 0) AS igst
                    FROM invoices
                    WHERE tenant_id = :tid AND deleted_at IS NULL AND status != 'draft'
                    GROUP BY m
                ),
                input_gst AS (
                    SELECT DATE_TRUNC('month', COALESCE(due_date, created_at::date))::date AS m,
                           COALESCE(SUM(gst_amount), 0) AS input_gst
                    FROM vendor_bills
                    WHERE tenant_id = :tid AND deleted_at IS NULL
                    GROUP BY m
                )
                SELECT TO_CHAR(months.month_start, 'Mon YYYY'),
                       COALESCE(og.cgst, 0), COALESCE(og.sgst, 0), COALESCE(og.igst, 0),
                       COALESCE(og.cgst, 0) + COALESCE(og.sgst, 0) + COALESCE(og.igst, 0) AS total_output,
                       COALESCE(ig.input_gst, 0),
                       COALESCE(og.cgst, 0) + COALESCE(og.sgst, 0) + COALESCE(og.igst, 0) - COALESCE(ig.input_gst, 0) AS net_gst
                FROM months
                LEFT JOIN output_gst og ON og.m = months.month_start
                LEFT JOIN input_gst ig ON ig.m = months.month_start
                ORDER BY months.month_start
                """)
                .setParameter("tid", tenantId)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[0]),
                Map.of(
                        "cgst", toBd(r[1]),
                        "sgst", toBd(r[2]),
                        "igst", toBd(r[3]),
                        "totalOutput", toBd(r[4]),
                        "inputGst", toBd(r[5]),
                        "netGst", toBd(r[6])
                )
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> expenseByCategory(LocalDate from, LocalDate to) {
        UUID tenantId = requireTenant();
        LocalDate startDate = from != null ? from : LocalDate.now().withDayOfMonth(1).minusMonths(5);
        LocalDate endDate = to != null ? to : LocalDate.now();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT category,
                       COUNT(*) AS expense_count,
                       COALESCE(SUM(amount), 0) AS total_amount
                FROM expenses
                WHERE tenant_id = :tid AND deleted_at IS NULL
                  AND date >= :startDate AND date <= :endDate
                GROUP BY category ORDER BY total_amount DESC
                """)
                .setParameter("tid", tenantId)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[0]),
                Map.of("expenseCount", toLong(r[1]), "totalAmount", toBd(r[2]))
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> vendorPerformance() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT v.name,
                       COUNT(sc.id) AS review_count,
                       COALESCE(AVG(sc.quality_rating), 0) AS avg_quality,
                       COALESCE(AVG(sc.timeliness_rating), 0) AS avg_timeliness,
                       COALESCE(AVG(sc.cost_rating), 0) AS avg_cost,
                       COALESCE((AVG(sc.quality_rating) + AVG(sc.timeliness_rating) + AVG(sc.cost_rating)) / 3.0, 0) AS overall_avg
                FROM vendors v
                LEFT JOIN vendor_scorecards sc ON sc.vendor_id = v.id AND sc.deleted_at IS NULL AND sc.tenant_id = :tid
                WHERE v.tenant_id = :tid AND v.deleted_at IS NULL
                GROUP BY v.id, v.name
                HAVING COUNT(sc.id) > 0
                ORDER BY overall_avg DESC
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[0]),
                Map.of(
                        "reviewCount", toLong(r[1]),
                        "avgQuality", toBd(r[2]),
                        "avgTimeliness", toBd(r[3]),
                        "avgCost", toBd(r[4]),
                        "overallAvg", toBd(r[5])
                )
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> payrollRegister() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT e.name, e.employee_code, e.designation, e.department,
                       e.salary_structure_json->>'basic' AS basic,
                       e.salary_structure_json->>'hra' AS hra,
                       e.salary_structure_json->>'da' AS da,
                       e.salary_structure_json->>'pf' AS pf,
                       e.salary_structure_json->>'esi' AS esi,
                       e.salary_structure_json->>'pt' AS pt,
                       e.salary_structure_json->>'gross' AS gross,
                       e.salary_structure_json->>'net' AS net
                FROM employees e
                WHERE e.tenant_id = :tid AND e.status = 'active' AND e.deleted_at IS NULL
                ORDER BY e.name
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("employeeCode", str(r[1]));
            data.put("designation", str(r[2]));
            data.put("department", str(r[3]));
            data.put("basic", str(r[4]));
            data.put("hra", str(r[5]));
            data.put("da", str(r[6]));
            data.put("pf", str(r[7]));
            data.put("esi", str(r[8]));
            data.put("pt", str(r[9]));
            data.put("gross", str(r[10]));
            data.put("net", str(r[11]));
            return new ReportRow(str(r[0]), data);
        }).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> conversionRate() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT COALESCE(source, 'All Sources') AS source,
                       COUNT(*) AS total_leads,
                       COUNT(*) FILTER (WHERE stage = 'Won') AS won,
                       COUNT(*) FILTER (WHERE stage = 'Lost') AS lost,
                       CASE WHEN COUNT(*) > 0
                            THEN ROUND(COUNT(*) FILTER (WHERE stage = 'Won') * 100.0 / COUNT(*), 1)
                            ELSE 0 END AS conversion_pct,
                       COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)
                           FILTER (WHERE stage IN ('Won','Lost')), 0) AS avg_cycle_days
                FROM leads
                WHERE tenant_id = :tid AND deleted_at IS NULL
                GROUP BY ROLLUP(source)
                ORDER BY source NULLS FIRST
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[0]),
                Map.of("totalLeads", toLong(r[1]), "won", toLong(r[2]), "lost", toLong(r[3]),
                        "conversionPct", toBd(r[4]), "avgCycleDays", toBd(r[5]))
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> activityByTeamMember() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT COALESCE(a.assigned_to::text, 'Unassigned') AS assignee,
                       COUNT(*) AS total_activities,
                       COUNT(*) FILTER (WHERE a.type = 'call') AS calls,
                       COUNT(*) FILTER (WHERE a.type = 'meeting') AS meetings,
                       COUNT(*) FILTER (WHERE a.type = 'email') AS emails,
                       COUNT(*) FILTER (WHERE a.type = 'site_visit') AS site_visits,
                       COUNT(*) FILTER (WHERE a.type NOT IN ('call','meeting','email','site_visit')) AS others
                FROM activities a
                WHERE a.tenant_id = :tid AND a.deleted_at IS NULL
                GROUP BY a.assigned_to ORDER BY total_activities DESC
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[0]),
                Map.of("totalActivities", toLong(r[1]), "calls", toLong(r[2]),
                        "meetings", toLong(r[3]), "emails", toLong(r[4]),
                        "siteVisits", toLong(r[5]), "others", toLong(r[6]))
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> milestoneSlippage() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT p.name AS project, ph.name AS phase, m.name AS milestone,
                       m.target_date, m.actual_date, m.status,
                       CASE WHEN m.actual_date IS NOT NULL AND m.target_date IS NOT NULL
                            THEN m.actual_date - m.target_date
                            WHEN m.target_date IS NOT NULL AND m.actual_date IS NULL AND m.status != 'completed'
                            THEN CURRENT_DATE - m.target_date
                            ELSE 0 END AS slip_days
                FROM milestones m
                JOIN project_phases ph ON ph.id = m.phase_id
                JOIN projects p ON p.id = ph.project_id
                WHERE p.tenant_id = :tid AND p.deleted_at IS NULL
                  AND ph.deleted_at IS NULL AND m.deleted_at IS NULL
                ORDER BY slip_days DESC, p.name, ph.display_order, m.target_date
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[2]),
                Map.of("project", str(r[0]), "phase", str(r[1]),
                        "targetDate", str(r[3]), "actualDate", str(r[4]),
                        "status", str(r[5]), "slipDays", toInt(r[6]))
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> resourceUtilization() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT ra.user_id::text,
                       COUNT(DISTINCT ra.project_id) AS project_count,
                       STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) AS projects,
                       MIN(ra.start_date) AS earliest_start,
                       MAX(ra.end_date) AS latest_end
                FROM resource_assignments ra
                JOIN projects p ON p.id = ra.project_id AND p.deleted_at IS NULL
                WHERE ra.tenant_id = :tid AND ra.deleted_at IS NULL
                GROUP BY ra.user_id ORDER BY project_count DESC
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[0]),
                Map.of("projectCount", toLong(r[1]), "projects", str(r[2]),
                        "earliestStart", str(r[3]), "latestEnd", str(r[4]))
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> woPOSummary() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT p.name AS project,
                       COUNT(DISTINCT wo.id) AS wo_count,
                       COALESCE(SUM(DISTINCT wo.value), 0) AS wo_value,
                       COUNT(DISTINCT po.id) AS po_count,
                       COALESCE(SUM(DISTINCT po.total), 0) AS po_value,
                       COUNT(DISTINCT wo.id) FILTER (WHERE wo.status = 'approved') AS wo_approved,
                       COUNT(DISTINCT po.id) FILTER (WHERE po.status = 'approved') AS po_approved
                FROM projects p
                LEFT JOIN work_orders wo ON wo.project_id = p.id AND wo.deleted_at IS NULL AND wo.tenant_id = :tid
                LEFT JOIN purchase_orders po ON po.work_order_id = wo.id AND po.deleted_at IS NULL AND po.tenant_id = :tid
                WHERE p.tenant_id = :tid AND p.deleted_at IS NULL
                GROUP BY p.id, p.name
                HAVING COUNT(wo.id) > 0 OR COUNT(po.id) > 0
                ORDER BY p.name
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                str(r[0]),
                Map.of("woCount", toLong(r[1]), "woValue", toBd(r[2]),
                        "poCount", toLong(r[3]), "poValue", toBd(r[4]),
                        "woApproved", toLong(r[5]), "poApproved", toLong(r[6]))
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> projectProfitability() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT p.name,
                       COALESCE((SELECT SUM(i.total) FROM invoices i
                           WHERE i.project_id = p.id AND i.tenant_id = :tid AND i.deleted_at IS NULL AND i.status != 'draft'), 0) AS revenue,
                       COALESCE((SELECT SUM(vb.amount) FROM vendor_bills vb
                           JOIN work_orders wo ON wo.id = vb.work_order_id
                           WHERE wo.project_id = p.id AND vb.tenant_id = :tid AND vb.deleted_at IS NULL), 0) AS vendor_costs,
                       COALESCE((SELECT SUM(e.amount) FROM expenses e
                           WHERE e.project_id = p.id AND e.tenant_id = :tid AND e.deleted_at IS NULL), 0) AS expenses
                FROM projects p
                WHERE p.tenant_id = :tid AND p.deleted_at IS NULL
                ORDER BY p.name
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> {
            BigDecimal revenue = toBd(r[1]);
            BigDecimal vendorCosts = toBd(r[2]);
            BigDecimal expenses = toBd(r[3]);
            BigDecimal profit = revenue.subtract(vendorCosts).subtract(expenses);
            BigDecimal margin = revenue.compareTo(BigDecimal.ZERO) > 0
                    ? profit.multiply(BigDecimal.valueOf(100)).divide(revenue, 1, java.math.RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            return new ReportRow(str(r[0]),
                    Map.of("revenue", revenue, "vendorCosts", vendorCosts,
                            "expenses", expenses, "profit", profit, "margin", margin));
        }).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> tdsRegister() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT vb.bill_number,
                       (SELECT v.name FROM vendors v WHERE v.id = vb.vendor_id),
                       (SELECT v.pan FROM vendors v WHERE v.id = vb.vendor_id) AS vendor_pan,
                       vb.tds_section, vb.tds_rate, vb.tds_amount,
                       vb.amount AS bill_amount, vb.due_date, vb.status
                FROM vendor_bills vb
                WHERE vb.tenant_id = :tid AND vb.deleted_at IS NULL
                  AND vb.tds_amount IS NOT NULL AND vb.tds_amount > 0
                ORDER BY vb.due_date DESC NULLS LAST
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("vendor", str(r[1]));
            data.put("vendorPan", str(r[2]));
            data.put("tdsSection", str(r[3]));
            data.put("tdsRate", toBd(r[4]));
            data.put("tdsAmount", toBd(r[5]));
            data.put("billAmount", toBd(r[6]));
            data.put("dueDate", str(r[7]));
            data.put("status", str(r[8]));
            return new ReportRow(str(r[0]), data);
        }).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> headcountAttrition() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT COALESCE(department, 'Unassigned') AS department,
                       COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE status = 'active') AS active,
                       COUNT(*) FILTER (WHERE status IN ('resigned', 'terminated')) AS exited,
                       COUNT(*) FILTER (WHERE status = 'on_notice') AS on_notice,
                       CASE WHEN COUNT(*) > 0
                            THEN ROUND(COUNT(*) FILTER (WHERE status IN ('resigned','terminated')) * 100.0 / COUNT(*), 1)
                            ELSE 0 END AS attrition_pct
                FROM employees
                WHERE tenant_id = :tid AND deleted_at IS NULL
                GROUP BY ROLLUP(department)
                ORDER BY department NULLS FIRST
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> new ReportRow(
                r[0] != null ? str(r[0]) : "All Departments",
                Map.of("total", toLong(r[1]), "active", toLong(r[2]),
                        "exited", toLong(r[3]), "onNotice", toLong(r[4]),
                        "attritionPct", toBd(r[5]))
        )).toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ReportRow> reimbursementSummary() {
        UUID tenantId = requireTenant();
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT e.name, e.employee_code,
                       COUNT(*) AS total_claims,
                       COUNT(*) FILTER (WHERE r.status = 'approved') AS approved,
                       COUNT(*) FILTER (WHERE r.status = 'pending') AS pending,
                       COUNT(*) FILTER (WHERE r.status = 'rejected') AS rejected,
                       COALESCE(SUM(r.amount), 0) AS total_amount,
                       COALESCE(SUM(r.amount) FILTER (WHERE r.status = 'approved'), 0) AS approved_amount
                FROM employees e
                LEFT JOIN reimbursements r ON r.employee_id = e.id
                    AND r.tenant_id = :tid AND r.deleted_at IS NULL
                WHERE e.tenant_id = :tid AND e.deleted_at IS NULL
                GROUP BY e.id, e.name, e.employee_code
                HAVING COUNT(r.id) > 0
                ORDER BY total_amount DESC
                """)
                .setParameter("tid", tenantId)
                .getResultList();
        return rows.stream().map(r -> {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("employeeCode", str(r[1]));
            data.put("totalClaims", toLong(r[2]));
            data.put("approved", toLong(r[3]));
            data.put("pending", toLong(r[4]));
            data.put("rejected", toLong(r[5]));
            data.put("totalAmount", toBd(r[6]));
            data.put("approvedAmount", toBd(r[7]));
            return new ReportRow(str(r[0]), data);
        }).toList();
    }

    private UUID requireTenant() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) throw AppException.badRequest("Tenant context is required");
        return tenantId;
    }

    private static String str(Object v) { return v != null ? v.toString() : ""; }
    private static long toLong(Object v) { return v instanceof Number n ? n.longValue() : 0L; }
    private static int toInt(Object v) { return v instanceof Number n ? n.intValue() : 0; }
    private static BigDecimal toBd(Object v) {
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return BigDecimal.ZERO;
    }
}
