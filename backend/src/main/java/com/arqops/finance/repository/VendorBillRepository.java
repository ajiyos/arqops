package com.arqops.finance.repository;

import com.arqops.finance.entity.VendorBill;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface VendorBillRepository extends JpaRepository<VendorBill, UUID> {

    Page<VendorBill> findByTenantId(UUID tenantId, Pageable pageable);
}
