package com.arqops.project.repository;

import com.arqops.project.entity.ProjectBudgetLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProjectBudgetLineRepository extends JpaRepository<ProjectBudgetLine, UUID> {

    List<ProjectBudgetLine> findByTenantIdAndProject_Id(UUID tenantId, UUID projectId);
}
