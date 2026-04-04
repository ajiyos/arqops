package com.arqops.finance.service;

import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.finance.dto.SacCodeDtos;
import com.arqops.finance.entity.TenantSacCode;
import com.arqops.finance.repository.TenantSacCodeRepository;
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
public class TenantSacCodeService {

    private final TenantSacCodeRepository repository;

    @Transactional(readOnly = true)
    public List<SacCodeDtos.SacCodeResponse> list() {
        UUID tenantId = requireTenantId();
        List<TenantSacCode> rows = repository.findByTenantIdOrderByDisplayOrderAsc(tenantId);
        List<SacCodeDtos.SacCodeResponse> out = new ArrayList<>();
        for (TenantSacCode row : rows) {
            out.add(new SacCodeDtos.SacCodeResponse(
                    row.getId(),
                    row.getCode(),
                    row.getDescription() != null ? row.getDescription() : "",
                    row.getDisplayOrder()));
        }
        return out;
    }

    @Transactional
    public void replaceAll(List<SacCodeDtos.SacCodeItem> items) {
        UUID tenantId = requireTenantId();
        if (items == null || items.isEmpty()) {
            repository.softDeleteAllForTenant(tenantId, Instant.now());
            return;
        }
        Set<String> seen = new HashSet<>();
        int order = 0;
        for (SacCodeDtos.SacCodeItem item : items) {
            if (item.code() == null || item.code().isBlank()) {
                continue;
            }
            String code = item.code().trim();
            if (code.length() > 10) {
                throw AppException.badRequest("SAC code must be at most 10 characters: " + code);
            }
            String key = code.toLowerCase(Locale.ROOT);
            if (!seen.add(key)) {
                throw AppException.badRequest("Duplicate SAC code in list: " + code);
            }
            order++;
        }
        if (order == 0) {
            repository.softDeleteAllForTenant(tenantId, Instant.now());
            return;
        }
        repository.softDeleteAllForTenant(tenantId, Instant.now());
        order = 0;
        for (SacCodeDtos.SacCodeItem item : items) {
            if (item.code() == null || item.code().isBlank()) {
                continue;
            }
            String code = item.code().trim();
            String desc = item.description() != null && !item.description().isBlank()
                    ? item.description().trim()
                    : null;
            if (desc != null && desc.length() > 255) {
                throw AppException.badRequest("Description must be at most 255 characters");
            }
            TenantSacCode row = TenantSacCode.builder()
                    .code(code)
                    .description(desc)
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
