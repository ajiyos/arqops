package com.arqops.hr.service;

import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.hr.DesignationRateDefaults;
import com.arqops.hr.dto.DesignationRateDtos;
import com.arqops.hr.entity.TenantDesignationHourlyRate;
import com.arqops.hr.repository.TenantDesignationHourlyRateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantDesignationHourlyRateService {

    private final TenantDesignationHourlyRateRepository repository;

    @Transactional
    public void seedDefaultsForNewTenant(UUID tenantId) {
        if (tenantId == null) {
            return;
        }
        List<TenantDesignationHourlyRate> existing = repository.findByTenantIdOrderByDisplayOrderAsc(tenantId);
        if (!existing.isEmpty()) {
            return;
        }
        for (DesignationRateDefaults.SeedRow row : DesignationRateDefaults.SEED_ROWS) {
            TenantDesignationHourlyRate entity = TenantDesignationHourlyRate.builder()
                    .designation(row.designation())
                    .hourlyRate(row.hourlyRate())
                    .displayOrder(row.displayOrder())
                    .build();
            entity.setTenantId(tenantId);
            repository.save(entity);
        }
    }

    @Transactional(readOnly = true)
    public List<DesignationRateDtos.RateResponse> list() {
        UUID tenantId = requireTenantId();
        List<TenantDesignationHourlyRate> rows = repository.findByTenantIdOrderByDisplayOrderAsc(tenantId);
        List<DesignationRateDtos.RateResponse> out = new ArrayList<>();
        for (TenantDesignationHourlyRate row : rows) {
            out.add(new DesignationRateDtos.RateResponse(
                    row.getId(), row.getDesignation(), row.getHourlyRate(), row.getDisplayOrder()));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public Optional<BigDecimal> resolveHourlyRate(UUID tenantId, String designation) {
        if (tenantId == null || designation == null || designation.isBlank()) {
            return Optional.empty();
        }
        return repository
                .findFirstByTenantIdAndDesignationIgnoreCase(tenantId, designation.trim())
                .map(TenantDesignationHourlyRate::getHourlyRate);
    }

    @Transactional(readOnly = true)
    public void assertActiveDesignation(UUID tenantId, String designation) {
        if (designation == null || designation.isBlank()) {
            throw AppException.badRequest("Designation is required");
        }
        repository
                .findFirstByTenantIdAndDesignationIgnoreCase(tenantId, designation.trim())
                .orElseThrow(() -> AppException.badRequest(
                        "Designation must match a configured designation rate"));
    }

    @Transactional
    public void replaceAll(List<DesignationRateDtos.RateItem> items) {
        UUID tenantId = requireTenantId();
        if (items == null || items.isEmpty()) {
            repository.softDeleteAllForTenant(tenantId, Instant.now());
            return;
        }
        Set<String> seen = new HashSet<>();
        int count = 0;
        for (DesignationRateDtos.RateItem item : items) {
            if (item.designation() == null || item.designation().isBlank()) {
                continue;
            }
            String d = item.designation().trim();
            if (d.length() > 100) {
                throw AppException.badRequest("Designation must be at most 100 characters");
            }
            String key = d.toLowerCase(Locale.ROOT);
            if (!seen.add(key)) {
                throw AppException.badRequest("Duplicate designation in list: " + d);
            }
            count++;
        }
        if (count == 0) {
            repository.softDeleteAllForTenant(tenantId, Instant.now());
            return;
        }
        repository.softDeleteAllForTenant(tenantId, Instant.now());
        int order = 0;
        for (DesignationRateDtos.RateItem item : items) {
            if (item.designation() == null || item.designation().isBlank()) {
                continue;
            }
            String d = item.designation().trim();
            TenantDesignationHourlyRate row = TenantDesignationHourlyRate.builder()
                    .designation(d)
                    .hourlyRate(item.hourlyRate())
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
