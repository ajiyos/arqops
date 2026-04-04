package com.arqops.finance.repository;

import com.arqops.finance.entity.TenantExpenseCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface TenantExpenseCategoryRepository extends JpaRepository<TenantExpenseCategory, UUID> {

    List<TenantExpenseCategory> findByTenantIdOrderByDisplayOrderAsc(UUID tenantId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE TenantExpenseCategory e SET e.deletedAt = :ts WHERE e.tenantId = :tenantId AND e.deletedAt IS NULL")
    void softDeleteAllForTenant(@Param("tenantId") UUID tenantId, @Param("ts") Instant ts);
}
