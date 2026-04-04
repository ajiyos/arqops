package com.arqops.project.repository;

import com.arqops.project.entity.TenantProjectType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface TenantProjectTypeRepository extends JpaRepository<TenantProjectType, UUID> {

    List<TenantProjectType> findByTenantIdOrderByDisplayOrderAsc(UUID tenantId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE TenantProjectType t SET t.deletedAt = :ts WHERE t.tenantId = :tenantId AND t.deletedAt IS NULL")
    void softDeleteAllForTenant(@Param("tenantId") UUID tenantId, @Param("ts") Instant ts);
}
