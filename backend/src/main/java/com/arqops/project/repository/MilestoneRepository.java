package com.arqops.project.repository;

import com.arqops.project.entity.Milestone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MilestoneRepository extends JpaRepository<Milestone, UUID> {

    List<Milestone> findByTenantIdAndPhase_Id(UUID tenantId, UUID phaseId);
}
