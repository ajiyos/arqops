package com.arqops.hr.repository;

import com.arqops.hr.entity.TenantDesignationHourlyRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TenantDesignationHourlyRateRepository extends JpaRepository<TenantDesignationHourlyRate, UUID> {

    List<TenantDesignationHourlyRate> findByTenantIdOrderByDisplayOrderAsc(UUID tenantId);

    Optional<TenantDesignationHourlyRate> findFirstByTenantIdAndDesignationIgnoreCase(UUID tenantId, String designation);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE TenantDesignationHourlyRate r SET r.deletedAt = :ts WHERE r.tenantId = :tenantId AND r.deletedAt IS NULL")
    void softDeleteAllForTenant(@Param("tenantId") UUID tenantId, @Param("ts") Instant ts);
}
