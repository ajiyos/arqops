package com.arqops.finance.repository;

import com.arqops.finance.entity.TenantSacCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface TenantSacCodeRepository extends JpaRepository<TenantSacCode, UUID> {

    List<TenantSacCode> findByTenantIdOrderByDisplayOrderAsc(UUID tenantId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE TenantSacCode t SET t.deletedAt = :ts WHERE t.tenantId = :tenantId AND t.deletedAt IS NULL")
    void softDeleteAllForTenant(@Param("tenantId") UUID tenantId, @Param("ts") Instant ts);
}
