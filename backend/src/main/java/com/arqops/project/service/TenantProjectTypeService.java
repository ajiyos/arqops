package com.arqops.project.service;

import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.project.ProjectTypeDefaults;
import com.arqops.project.dto.ProjectTypeDtos;
import com.arqops.project.entity.TenantProjectType;
import com.arqops.project.repository.TenantProjectTypeRepository;
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
public class TenantProjectTypeService {

    private final TenantProjectTypeRepository repository;

    @Transactional
    public void seedDefaultsForNewTenant(UUID tenantId) {
        if (tenantId == null) {
            return;
        }
        if (!repository.findByTenantIdOrderByDisplayOrderAsc(tenantId).isEmpty()) {
            return;
        }
        int order = 0;
        for (String name : ProjectTypeDefaults.SEED_NAMES) {
            TenantProjectType row = TenantProjectType.builder()
                    .name(name)
                    .displayOrder(order++)
                    .build();
            row.setTenantId(tenantId);
            repository.save(row);
        }
    }

    @Transactional(readOnly = true)
    public List<ProjectTypeDtos.TypeResponse> list() {
        UUID tenantId = requireTenantId();
        List<TenantProjectType> rows = repository.findByTenantIdOrderByDisplayOrderAsc(tenantId);
        List<ProjectTypeDtos.TypeResponse> out = new ArrayList<>();
        for (TenantProjectType row : rows) {
            out.add(new ProjectTypeDtos.TypeResponse(row.getId(), row.getName(), row.getDisplayOrder()));
        }
        return out;
    }

    @Transactional
    public void replaceAll(List<ProjectTypeDtos.TypeItem> items) {
        UUID tenantId = requireTenantId();
        if (items == null || items.isEmpty()) {
            repository.softDeleteAllForTenant(tenantId, Instant.now());
            return;
        }
        Set<String> seen = new HashSet<>();
        int count = 0;
        for (ProjectTypeDtos.TypeItem item : items) {
            if (item.name() == null || item.name().isBlank()) {
                continue;
            }
            String name = item.name().trim();
            if (name.length() > 100) {
                throw AppException.badRequest("Project type name must be at most 100 characters");
            }
            String key = name.toLowerCase(Locale.ROOT);
            if (!seen.add(key)) {
                throw AppException.badRequest("Duplicate project type in list: " + name);
            }
            count++;
        }
        if (count == 0) {
            repository.softDeleteAllForTenant(tenantId, Instant.now());
            return;
        }
        repository.softDeleteAllForTenant(tenantId, Instant.now());
        int order = 0;
        for (ProjectTypeDtos.TypeItem item : items) {
            if (item.name() == null || item.name().isBlank()) {
                continue;
            }
            String name = item.name().trim();
            TenantProjectType row = TenantProjectType.builder()
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
