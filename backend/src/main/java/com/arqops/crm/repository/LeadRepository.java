package com.arqops.crm.repository;

import com.arqops.crm.entity.Lead;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LeadRepository extends JpaRepository<Lead, UUID> {

    Page<Lead> findByTenantId(UUID tenantId, Pageable pageable);

    Page<Lead> findByTenantIdAndStage(UUID tenantId, String stage, Pageable pageable);

    long countByTenantIdAndStage(UUID tenantId, String stage);
}
