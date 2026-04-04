package com.arqops.project.repository;

import com.arqops.project.entity.ProjectPhase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProjectPhaseRepository extends JpaRepository<ProjectPhase, UUID> {

    List<ProjectPhase> findByTenantIdAndProject_IdOrderByDisplayOrderAsc(UUID tenantId, UUID projectId);
}
