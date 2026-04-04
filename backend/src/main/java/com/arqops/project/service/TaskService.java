package com.arqops.project.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.project.dto.TaskRequest;
import com.arqops.project.dto.TaskResponse;
import com.arqops.project.entity.Milestone;
import com.arqops.project.entity.Project;
import com.arqops.project.entity.Task;
import com.arqops.project.repository.MilestoneRepository;
import com.arqops.project.repository.ProjectRepository;
import com.arqops.project.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final MilestoneRepository milestoneRepository;
    private final AuditService auditService;

    public Page<TaskResponse> listByProject(UUID projectId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        ensureProjectInTenant(projectId, tenantId);
        return taskRepository.findByTenantIdAndProject_Id(tenantId, projectId, pageable).map(TaskResponse::from);
    }

    @Transactional(readOnly = true)
    public Task getTask(UUID taskId) {
        return loadTaskInCurrentTenant(taskId);
    }

    @Transactional(readOnly = true)
    public TaskResponse get(UUID taskId) {
        return TaskResponse.from(loadTaskInCurrentTenant(taskId));
    }

    private Task loadTaskInCurrentTenant(UUID taskId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> AppException.notFound("Task", taskId));
        assertTenant(task, tenantId);
        return task;
    }

    @Transactional
    public void delete(UUID taskId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> AppException.notFound("Task", taskId));
        assertTenant(task, tenantId);
        task.setDeletedAt(Instant.now());
        taskRepository.save(task);
        auditService.log("Task", task.getId(), "DELETE", Map.of("title", task.getTitle()));
    }

    @Transactional
    public TaskResponse create(UUID projectId, TaskRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (!StringUtils.hasText(request.title())) {
            throw AppException.badRequest("Task title is required");
        }
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> AppException.notFound("Project", projectId));
        assertTenant(project, tenantId);
        Task task = Task.builder()
                .project(project)
                .title(request.title())
                .description(request.description())
                .assigneeId(request.assigneeId())
                .priority(request.priority() != null ? request.priority() : "medium")
                .status(request.status() != null ? request.status() : "todo")
                .dueDate(request.dueDate())
                .build();
        task.setTenantId(tenantId);
        if (request.milestoneId() != null) {
            Milestone ms = milestoneRepository.findById(request.milestoneId())
                    .orElseThrow(() -> AppException.notFound("Milestone", request.milestoneId()));
            assertTenant(ms, tenantId);
            if (!ms.getPhase().getProject().getId().equals(projectId)) {
                throw AppException.badRequest("Milestone does not belong to this project");
            }
            task.setMilestone(ms);
        }
        task = taskRepository.save(task);
        auditService.log("Task", task.getId(), "CREATE", Map.of("projectId", projectId.toString()));
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse update(UUID taskId, TaskRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> AppException.notFound("Task", taskId));
        assertTenant(task, tenantId);
        if (!StringUtils.hasText(request.title())) {
            throw AppException.badRequest("Task title is required");
        }
        task.setTitle(request.title());
        task.setDescription(request.description());
        task.setAssigneeId(request.assigneeId());
        if (request.priority() != null) {
            task.setPriority(request.priority());
        }
        if (request.status() != null) {
            task.setStatus(request.status());
        }
        task.setDueDate(request.dueDate());
        if (request.milestoneId() != null) {
            Milestone ms = milestoneRepository.findById(request.milestoneId())
                    .orElseThrow(() -> AppException.notFound("Milestone", request.milestoneId()));
            assertTenant(ms, tenantId);
            UUID projectId = task.getProject().getId();
            if (!ms.getPhase().getProject().getId().equals(projectId)) {
                throw AppException.badRequest("Milestone does not belong to this project");
            }
            task.setMilestone(ms);
        } else {
            task.setMilestone(null);
        }
        task = taskRepository.save(task);
        auditService.log("Task", task.getId(), "UPDATE", Map.of());
        return TaskResponse.from(task);
    }

    private void ensureProjectInTenant(UUID projectId, UUID tenantId) {
        Project p = projectRepository.findById(projectId)
                .orElseThrow(() -> AppException.notFound("Project", projectId));
        assertTenant(p, tenantId);
    }

    private void assertTenant(Project project, UUID tenantId) {
        if (tenantId != null && !tenantId.equals(project.getTenantId())) {
            throw AppException.forbidden("Access denied");
        }
    }

    private void assertTenant(Task task, UUID tenantId) {
        if (tenantId != null && !tenantId.equals(task.getTenantId())) {
            throw AppException.forbidden("Access denied");
        }
    }

    private void assertTenant(Milestone milestone, UUID tenantId) {
        if (tenantId != null && !tenantId.equals(milestone.getTenantId())) {
            throw AppException.forbidden("Access denied");
        }
    }
}
