package com.arqops.crm.repository;

import com.arqops.crm.entity.LeadStage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LeadStageRepository extends JpaRepository<LeadStage, UUID> {

    List<LeadStage> findByTenantIdOrderByDisplayOrderAsc(UUID tenantId);
}
