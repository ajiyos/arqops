package com.arqops.project.repository;

import com.arqops.project.entity.TaskComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskCommentRepository extends JpaRepository<TaskComment, UUID> {

    List<TaskComment> findByTenantIdAndTask_IdOrderByCreatedAtDesc(UUID tenantId, UUID taskId);
}
