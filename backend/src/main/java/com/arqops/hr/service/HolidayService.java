package com.arqops.hr.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.hr.entity.Holiday;
import com.arqops.hr.repository.HolidayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class HolidayService {

    private final HolidayRepository holidayRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<Holiday> list(Integer year) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (year != null) {
            LocalDate start = LocalDate.of(year, 1, 1);
            LocalDate end = LocalDate.of(year, 12, 31);
            return holidayRepository.findByTenantIdAndDateBetweenOrderByDateAsc(tenantId, start, end);
        }
        return holidayRepository.findByTenantIdOrderByDateAsc(tenantId);
    }

    @Transactional
    public Holiday create(String name, LocalDate date, String type) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Holiday h = Holiday.builder()
                .name(name)
                .date(date)
                .type(type != null ? type : "national")
                .build();
        h.setTenantId(tenantId);
        h = holidayRepository.save(h);
        auditService.log("Holiday", h.getId(), "CREATE", Map.of("name", name));
        return h;
    }

    @Transactional
    public Holiday update(UUID id, String name, LocalDate date, String type) {
        Holiday h = holidayRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Holiday", id));
        if (name != null) h.setName(name);
        if (date != null) h.setDate(date);
        if (type != null) h.setType(type);
        h = holidayRepository.save(h);
        auditService.log("Holiday", h.getId(), "UPDATE", Map.of("name", h.getName()));
        return h;
    }

    @Transactional
    public void delete(UUID id) {
        Holiday h = holidayRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Holiday", id));
        h.setDeletedAt(Instant.now());
        holidayRepository.save(h);
        auditService.log("Holiday", h.getId(), "DELETE", Map.of("name", h.getName()));
    }
}
