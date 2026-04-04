package com.arqops.project.repository;

import com.arqops.project.entity.ProjectDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProjectDocumentRepository extends JpaRepository<ProjectDocument, UUID> {

    List<ProjectDocument> findByTenantIdAndProject_Id(UUID tenantId, UUID projectId);
}
