package com.arqops.hr.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.security.UserPrincipal;
import com.arqops.common.storage.google.GoogleDriveStorageService;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.finance.entity.Expense;
import com.arqops.finance.repository.ExpenseRepository;
import com.arqops.hr.dto.ReimbursementRequest;
import com.arqops.hr.dto.ReimbursementResponse;
import com.arqops.hr.entity.Employee;
import com.arqops.hr.entity.Reimbursement;
import com.arqops.hr.repository.EmployeeRepository;
import com.arqops.hr.repository.ReimbursementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReimbursementService {

    private final ReimbursementRepository reimbursementRepository;
    private final EmployeeRepository employeeRepository;
    private final ExpenseRepository expenseRepository;
    private final AuditService auditService;
    private final GoogleDriveStorageService googleDriveStorageService;

    public Page<ReimbursementResponse> list(UUID employeeId, String status, Pageable pageable) {
        String st = status != null && !status.isBlank() ? status.trim().toLowerCase() : null;
        if (employeeId != null) {
            ensureEmployee(employeeId);
            if (st != null) {
                return reimbursementRepository.findByEmployeeIdAndStatus(employeeId, st, pageable)
                        .map(ReimbursementResponse::from);
            }
            return reimbursementRepository.findByEmployeeId(employeeId, pageable).map(ReimbursementResponse::from);
        }
        if (st != null) {
            return reimbursementRepository.findByStatus(st, pageable).map(ReimbursementResponse::from);
        }
        return reimbursementRepository.findAll(pageable).map(ReimbursementResponse::from);
    }

    @Transactional
    public ReimbursementResponse submit(ReimbursementRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        ensureEmployee(request.employeeId());
        if (request.receiptStorageKey() != null && !request.receiptStorageKey().isBlank()) {
            googleDriveStorageService.assertFileInTenantScope(request.receiptStorageKey(), tenantId);
        }

        Reimbursement r = Reimbursement.builder()
                .employeeId(request.employeeId())
                .category(request.category())
                .amount(request.amount())
                .description(request.description())
                .receiptStorageKey(request.receiptStorageKey())
                .status("pending")
                .build();
        r.setTenantId(tenantId);
        r = reimbursementRepository.save(r);
        auditService.log("Reimbursement", r.getId(), "SUBMIT", Map.of("amount", request.amount().toString()));
        return ReimbursementResponse.from(r);
    }

    @Transactional
    public ReimbursementResponse approve(UUID id) {
        Reimbursement r = reimbursementRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Reimbursement", id));
        if (!"pending".equals(r.getStatus())) {
            throw AppException.badRequest("Reimbursement is not pending");
        }
        UUID approverId = currentUserId();
        r.setStatus("approved");
        r.setApprovedBy(approverId);
        r = reimbursementRepository.save(r);

        Expense expense = Expense.builder()
                .category("Reimbursement - " + r.getCategory())
                .amount(r.getAmount())
                .expenseDate(LocalDate.now())
                .description("Auto-created from approved reimbursement #" + r.getId())
                .receiptStorageKey(r.getReceiptStorageKey())
                .createdBy(approverId)
                .build();
        expense.setTenantId(TenantContext.getCurrentTenantId());
        expense = expenseRepository.save(expense);
        r.setExpenseId(expense.getId());
        r = reimbursementRepository.save(r);

        auditService.log("Reimbursement", r.getId(), "APPROVE",
                Map.of("approvedBy", String.valueOf(approverId), "expenseId", expense.getId().toString()));
        return ReimbursementResponse.from(r);
    }

    @Transactional
    public ReimbursementResponse reject(UUID id) {
        Reimbursement r = reimbursementRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Reimbursement", id));
        if (!"pending".equals(r.getStatus())) {
            throw AppException.badRequest("Reimbursement is not pending");
        }
        UUID approverId = currentUserId();
        r.setStatus("rejected");
        r.setApprovedBy(approverId);
        r = reimbursementRepository.save(r);
        auditService.log("Reimbursement", r.getId(), "REJECT", Map.of("rejectedBy", String.valueOf(approverId)));
        return ReimbursementResponse.from(r);
    }

    private UUID currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.userId();
        }
        throw AppException.unauthorized("Not authenticated");
    }

    private void ensureEmployee(UUID employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> AppException.notFound("Employee", employeeId));
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId != null && !tenantId.equals(employee.getTenantId())) {
            throw AppException.forbidden("Access denied");
        }
    }
}
