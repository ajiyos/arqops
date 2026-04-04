package com.arqops.project.repository;

import com.arqops.project.entity.ProjectTypePhaseTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProjectTypePhaseTemplateRepository extends JpaRepository<ProjectTypePhaseTemplate, UUID> {

    List<ProjectTypePhaseTemplate> findByTenantIdAndProjectTypeOrderByDisplayOrderAsc(UUID tenantId, String projectType);

    List<ProjectTypePhaseTemplate> findByTenantIdOrderByProjectTypeAscDisplayOrderAsc(UUID tenantId);

    @Query("SELECT DISTINCT p FROM ProjectTypePhaseTemplate p LEFT JOIN FETCH p.milestoneTemplates WHERE p.tenantId = :tenantId")
    List<ProjectTypePhaseTemplate> findAllByTenantIdWithMilestones(@Param("tenantId") UUID tenantId);

    @Query("SELECT DISTINCT p FROM ProjectTypePhaseTemplate p LEFT JOIN FETCH p.milestoneTemplates "
            + "WHERE p.tenantId = :tenantId AND p.projectType = :projectType")
    List<ProjectTypePhaseTemplate> findByTenantIdAndProjectTypeWithMilestones(
            @Param("tenantId") UUID tenantId, @Param("projectType") String projectType);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM ProjectTypePhaseTemplate t WHERE t.tenantId = :tenantId AND t.projectType = :projectType")
    void deleteByTenantIdAndProjectType(@Param("tenantId") UUID tenantId, @Param("projectType") String projectType);
}
