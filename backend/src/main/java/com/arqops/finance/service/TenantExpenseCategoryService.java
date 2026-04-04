package com.arqops.finance.service;

import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.finance.ExpenseCategoryDefaults;
import com.arqops.finance.dto.ExpenseCategoryDtos;
import com.arqops.finance.entity.TenantExpenseCategory;
import com.arqops.finance.repository.TenantExpenseCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantExpenseCategoryService {

    private final TenantExpenseCategoryRepository repository;

    /**
     * Inserts {@link ExpenseCategoryDefaults#SEED_NAMES} when the tenant has no categories (e.g. new workspace).
     */
    @Transactional
    public void seedDefaultsForNewTenant(UUID tenantId) {
        if (tenantId == null) {
            return;
        }
        List<TenantExpenseCategory> existing = repository.findByTenantIdOrderByDisplayOrderAsc(tenantId);
        if (!existing.isEmpty()) {
            return;
        }
        int order = 0;
        for (String name : ExpenseCategoryDefaults.SEED_NAMES) {
            TenantExpenseCategory row = TenantExpenseCategory.builder()
                    .name(name)
                    .displayOrder(order++)
                    .build();
            row.setTenantId(tenantId);
            repository.save(row);
        }
    }

    @Transactional(readOnly = true)
    public List<ExpenseCategoryDtos.CategoryResponse> list() {
        UUID tenantId = requireTenantId();
        List<TenantExpenseCategory> rows = repository.findByTenantIdOrderByDisplayOrderAsc(tenantId);
        List<ExpenseCategoryDtos.CategoryResponse> out = new ArrayList<>();
        for (TenantExpenseCategory row : rows) {
            out.add(new ExpenseCategoryDtos.CategoryResponse(
                    row.getId(), row.getName(), row.getDisplayOrder()));
        }
        return out;
    }

    @Transactional
    public void replaceAll(List<ExpenseCategoryDtos.CategoryItem> items) {
        UUID tenantId = requireTenantId();
        if (items == null || items.isEmpty()) {
            repository.softDeleteAllForTenant(tenantId, Instant.now());
            return;
        }
        Set<String> seen = new HashSet<>();
        int count = 0;
        for (ExpenseCategoryDtos.CategoryItem item : items) {
            if (item.name() == null || item.name().isBlank()) {
                continue;
            }
            String name = item.name().trim();
            if (name.length() > 50) {
                throw AppException.badRequest("Category name must be at most 50 characters");
            }
            String key = name.toLowerCase(Locale.ROOT);
            if (!seen.add(key)) {
                throw AppException.badRequest("Duplicate category in list: " + name);
            }
            count++;
        }
        if (count == 0) {
            repository.softDeleteAllForTenant(tenantId, Instant.now());
            return;
        }
        repository.softDeleteAllForTenant(tenantId, Instant.now());
        int order = 0;
        for (ExpenseCategoryDtos.CategoryItem item : items) {
            if (item.name() == null || item.name().isBlank()) {
                continue;
            }
            String name = item.name().trim();
            TenantExpenseCategory row = TenantExpenseCategory.builder()
                    .name(name)
                    .displayOrder(order++)
                    .build();
            row.setTenantId(tenantId);
            repository.save(row);
        }
    }

    private static UUID requireTenantId() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            throw AppException.forbidden("A workspace context is required");
        }
        return tenantId;
    }
}
