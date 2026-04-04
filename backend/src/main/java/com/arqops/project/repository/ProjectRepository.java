package com.arqops.project.repository;

import com.arqops.project.entity.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

    boolean existsByTenantIdAndLeadId(UUID tenantId, UUID leadId);

    Page<Project> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("""
            SELECT p FROM Project p
            WHERE p.tenantId = :tenantId
            AND (
                LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(p.type, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(p.location, '')) LIKE LOWER(CONCAT('%', :q, '%'))
            )
            """)
    Page<Project> searchByTenantId(@Param("tenantId") UUID tenantId, @Param("q") String q, Pageable pageable);
}
