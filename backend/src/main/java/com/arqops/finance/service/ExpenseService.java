package com.arqops.finance.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.security.UserPrincipal;
import com.arqops.common.storage.FileDownload;
import com.arqops.common.storage.google.GoogleDriveStorageService;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.finance.dto.ExpenseRequest;
import com.arqops.finance.dto.ExpenseResponse;
import com.arqops.finance.entity.Expense;
import com.arqops.finance.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final AuditService auditService;
    private final GoogleDriveStorageService googleDriveStorageService;

    public Page<ExpenseResponse> list(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        return expenseRepository.findByTenantId(tenantId, pageable).map(ExpenseResponse::from);
    }

    public ExpenseResponse getById(UUID id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Expense", id));
        assertTenant(expense);
        return ExpenseResponse.from(expense);
    }

    @Transactional
    public ExpenseResponse create(ExpenseRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (request.receiptStorageKey() != null && !request.receiptStorageKey().isBlank()) {
            googleDriveStorageService.assertFileInTenantScope(request.receiptStorageKey(), tenantId);
        }
        Expense expense = Expense.builder()
                .projectId(request.projectId())
                .category(request.category())
                .amount(request.amount())
                .expenseDate(request.expenseDate())
                .description(request.description())
                .receiptStorageKey(request.receiptStorageKey())
                .createdBy(currentUserId())
                .build();
        expense.setTenantId(tenantId);
        expense = expenseRepository.save(expense);
        auditService.log("Expense", expense.getId(), "CREATE", Map.of("category", expense.getCategory()));
        return ExpenseResponse.from(expense);
    }

    @Transactional
    public ExpenseResponse update(UUID id, ExpenseRequest request) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Expense", id));
        assertTenant(expense);
        if (request.receiptStorageKey() != null && !request.receiptStorageKey().isBlank()) {
            googleDriveStorageService.assertFileInTenantScope(request.receiptStorageKey(), TenantContext.getCurrentTenantId());
        }
        expense.setProjectId(request.projectId());
        expense.setCategory(request.category());
        expense.setAmount(request.amount());
        expense.setExpenseDate(request.expenseDate());
        expense.setDescription(request.description());
        expense.setReceiptStorageKey(request.receiptStorageKey());
        expense = expenseRepository.save(expense);
        auditService.log("Expense", expense.getId(), "UPDATE", Map.of());
        return ExpenseResponse.from(expense);
    }

    @Transactional
    public void delete(UUID id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Expense", id));
        assertTenant(expense);
        expense.setDeletedAt(java.time.Instant.now());
        expenseRepository.save(expense);
        auditService.log("Expense", expense.getId(), "DELETE", Map.of());
    }

    private void assertTenant(Expense expense) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId != null && !tenantId.equals(expense.getTenantId())) {
            throw AppException.forbidden("Access denied");
        }
    }

    @Transactional(readOnly = true)
    public FileDownload openReceiptDownload(UUID id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Expense", id));
        assertTenant(expense);
        if (expense.getReceiptStorageKey() == null || expense.getReceiptStorageKey().isBlank()) {
            throw AppException.badRequest("No receipt file attached to this expense");
        }
        return googleDriveStorageService.openTenantFileDownload(expense.getReceiptStorageKey());
    }

    private static UUID currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.userId();
        }
        return null;
    }
}
