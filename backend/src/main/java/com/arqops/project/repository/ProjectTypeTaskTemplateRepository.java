package com.arqops.project.repository;

import com.arqops.project.entity.ProjectTypeTaskTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProjectTypeTaskTemplateRepository extends JpaRepository<ProjectTypeTaskTemplate, UUID> {

    List<ProjectTypeTaskTemplate> findByTenantIdAndProjectTypeOrderByDisplayOrderAsc(
            UUID tenantId, String projectType);

    List<ProjectTypeTaskTemplate> findByTenantIdOrderByProjectTypeAscDisplayOrderAsc(UUID tenantId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM ProjectTypeTaskTemplate t WHERE t.tenantId = :tenantId AND t.projectType = :projectType")
    void deleteByTenantIdAndProjectType(@Param("tenantId") UUID tenantId, @Param("projectType") String projectType);
}
