package com.arqops.vendor.repository;

import com.arqops.vendor.entity.WorkOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, UUID> {

    Page<WorkOrder> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT w FROM WorkOrder w WHERE w.tenantId = :tenantId AND w.vendor.id = :vendorId")
    Page<WorkOrder> findByTenantIdAndVendorId(
            @Param("tenantId") UUID tenantId,
            @Param("vendorId") UUID vendorId,
            Pageable pageable);
}
