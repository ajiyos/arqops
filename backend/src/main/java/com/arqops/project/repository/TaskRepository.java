package com.arqops.project.repository;

import com.arqops.project.entity.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    Page<Task> findByTenantIdAndProject_Id(UUID tenantId, UUID projectId, Pageable pageable);
}
