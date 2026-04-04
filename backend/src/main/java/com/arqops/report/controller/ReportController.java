package com.arqops.report.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.report.dto.DashboardResponse;
import com.arqops.report.dto.ReportRow;
import com.arqops.report.service.DashboardService;
import com.arqops.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final DashboardService dashboardService;
    private final ReportService reportService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<DashboardResponse>> dashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.buildDashboard(from, to)));
    }

    @GetMapping("/crm/pipeline")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> crmPipeline() {
        return ResponseEntity.ok(ApiResponse.success(reportService.crmPipeline()));
    }

    @GetMapping("/crm/lead-source")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> leadSource() {
        return ResponseEntity.ok(ApiResponse.success(reportService.leadSourceAnalysis()));
    }

    @GetMapping("/projects/status")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> projectStatus() {
        return ResponseEntity.ok(ApiResponse.success(reportService.projectStatus()));
    }

    @GetMapping("/projects/budget-variance")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> budgetVariance() {
        return ResponseEntity.ok(ApiResponse.success(reportService.budgetVariance()));
    }

    @GetMapping("/finance/receivables")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> financeReceivables() {
        return ResponseEntity.ok(ApiResponse.success(reportService.receivablesAging()));
    }

    @GetMapping("/finance/payables")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> financePayables() {
        return ResponseEntity.ok(ApiResponse.success(reportService.payablesAging()));
    }

    @GetMapping("/finance/revenue-expenses")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> revenueExpenses(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(reportService.revenueExpenses(from, to)));
    }

    @GetMapping("/finance/gst")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> gstSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(reportService.gstSummary(from, to)));
    }

    @GetMapping("/finance/expense-by-category")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> expenseByCategory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(reportService.expenseByCategory(from, to)));
    }

    @GetMapping("/hr/attendance")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> hrAttendance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(reportService.attendanceSummary(from, to)));
    }

    @GetMapping("/hr/leave-summary")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> leaveSummary() {
        return ResponseEntity.ok(ApiResponse.success(reportService.leaveSummary()));
    }

    @GetMapping("/vendor/performance")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> vendorPerformance() {
        return ResponseEntity.ok(ApiResponse.success(reportService.vendorPerformance()));
    }

    @GetMapping("/hr/payroll-register")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> payrollRegister() {
        return ResponseEntity.ok(ApiResponse.success(reportService.payrollRegister()));
    }

    @GetMapping("/crm/conversion-rate")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> conversionRate() {
        return ResponseEntity.ok(ApiResponse.success(reportService.conversionRate()));
    }

    @GetMapping("/crm/activity-by-member")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> activityByMember() {
        return ResponseEntity.ok(ApiResponse.success(reportService.activityByTeamMember()));
    }

    @GetMapping("/projects/milestone-slippage")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> milestoneSlippage() {
        return ResponseEntity.ok(ApiResponse.success(reportService.milestoneSlippage()));
    }

    @GetMapping("/projects/resource-utilization")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> resourceUtilization() {
        return ResponseEntity.ok(ApiResponse.success(reportService.resourceUtilization()));
    }

    @GetMapping("/vendor/wo-po-summary")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> woPOSummary() {
        return ResponseEntity.ok(ApiResponse.success(reportService.woPOSummary()));
    }

    @GetMapping("/projects/profitability")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> projectProfitability() {
        return ResponseEntity.ok(ApiResponse.success(reportService.projectProfitability()));
    }

    @GetMapping("/finance/tds-register")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> tdsRegister() {
        return ResponseEntity.ok(ApiResponse.success(reportService.tdsRegister()));
    }

    @GetMapping("/hr/headcount-attrition")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> headcountAttrition() {
        return ResponseEntity.ok(ApiResponse.success(reportService.headcountAttrition()));
    }

    @GetMapping("/hr/reimbursement-summary")
    @PreAuthorize("hasAuthority('report.read')")
    public ResponseEntity<ApiResponse<List<ReportRow>>> reimbursementSummary() {
        return ResponseEntity.ok(ApiResponse.success(reportService.reimbursementSummary()));
    }
}
