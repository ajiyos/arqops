package com.arqops.vendor.repository;

import com.arqops.vendor.entity.VendorScorecard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface VendorScorecardRepository extends JpaRepository<VendorScorecard, UUID> {

    @Query("SELECT s FROM VendorScorecard s WHERE s.tenantId = :tenantId AND s.vendor.id = :vendorId")
    List<VendorScorecard> findByTenantIdAndVendorId(
            @Param("tenantId") UUID tenantId,
            @Param("vendorId") UUID vendorId);
}
