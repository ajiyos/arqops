package com.arqops.project.dto;

import com.arqops.project.entity.Task;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record TaskResponse(
        UUID id,
        UUID projectId,
        UUID milestoneId,
        String title,
        String description,
        UUID assigneeId,
        String priority,
        String status,
        LocalDate dueDate,
        Instant createdAt,
        Instant updatedAt
) {
    public static TaskResponse from(Task t) {
        return new TaskResponse(
                t.getId(),
                t.getProject().getId(),
                t.getMilestone() != null ? t.getMilestone().getId() : null,
                t.getTitle(),
                t.getDescription(),
                t.getAssigneeId(),
                t.getPriority(),
                t.getStatus(),
                t.getDueDate(),
                t.getCreatedAt(),
                t.getUpdatedAt()
        );
    }
}
