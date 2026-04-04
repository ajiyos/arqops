package com.arqops.hr.repository;

import com.arqops.hr.entity.TimeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TimeEntryRepository extends JpaRepository<TimeEntry, UUID> {

    List<TimeEntry> findByTenantIdAndEmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(
            UUID tenantId, UUID employeeId, LocalDate from, LocalDate to);

    List<TimeEntry> findByTenantIdAndProjectIdAndBillableTrue(UUID tenantId, UUID projectId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE TimeEntry t SET t.deletedAt = :ts
            WHERE t.tenantId = :tenantId AND t.employeeId = :employeeId
            AND t.workDate >= :fromDate AND t.workDate <= :toDate AND t.deletedAt IS NULL
            """)
    void softDeleteInRange(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("ts") Instant ts);
}
