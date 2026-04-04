package com.arqops.hr.repository;

import com.arqops.hr.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface HolidayRepository extends JpaRepository<Holiday, UUID> {

    List<Holiday> findByTenantIdOrderByDateAsc(UUID tenantId);

    List<Holiday> findByTenantIdAndDateBetweenOrderByDateAsc(UUID tenantId, LocalDate start, LocalDate end);
}
