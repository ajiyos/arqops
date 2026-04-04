package com.arqops.vendor.repository;

import com.arqops.vendor.entity.Vendor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface VendorRepository extends JpaRepository<Vendor, UUID> {

    Page<Vendor> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("""
            SELECT v FROM Vendor v
            WHERE v.tenantId = :tenantId
            AND (
                LOWER(v.name) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(v.category, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(v.specialty, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(v.email, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(v.phone, '')) LIKE LOWER(CONCAT('%', :q, '%'))
            )
            """)
    Page<Vendor> searchByTenantId(@Param("tenantId") UUID tenantId, @Param("q") String q, Pageable pageable);
}
