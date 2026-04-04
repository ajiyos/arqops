package com.arqops.project.repository;

import com.arqops.project.entity.ResourceAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ResourceAssignmentRepository extends JpaRepository<ResourceAssignment, UUID> {

    List<ResourceAssignment> findByTenantIdAndProject_Id(UUID tenantId, UUID projectId);
}
