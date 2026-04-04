package com.arqops.vendor.repository;

import com.arqops.vendor.entity.PurchaseOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {

    Page<PurchaseOrder> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT p FROM PurchaseOrder p WHERE p.tenantId = :tenantId AND p.workOrder.id = :workOrderId")
    Page<PurchaseOrder> findByTenantIdAndWorkOrderId(
            @Param("tenantId") UUID tenantId,
            @Param("workOrderId") UUID workOrderId,
            Pageable pageable);
}
