package com.arqops.project.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.project.entity.Project;
import com.arqops.project.entity.ResourceAssignment;
import com.arqops.project.repository.ProjectRepository;
import com.arqops.project.repository.ResourceAssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ResourceAssignmentService {

    private final ResourceAssignmentRepository assignmentRepository;
    private final ProjectRepository projectRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<ResourceAssignment> listByProject(UUID projectId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        return assignmentRepository.findByTenantIdAndProject_Id(tenantId, projectId);
    }

    @Transactional
    public ResourceAssignment create(UUID projectId, UUID userId, String role,
                                     LocalDate startDate, LocalDate endDate) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> AppException.notFound("Project", projectId));

        ResourceAssignment ra = ResourceAssignment.builder()
                .project(project)
                .userId(userId)
                .role(role)
                .startDate(startDate)
                .endDate(endDate)
                .build();
        ra.setTenantId(tenantId);
        ra = assignmentRepository.save(ra);
        auditService.log("ResourceAssignment", ra.getId(), "CREATE",
                Map.of("projectId", projectId.toString(), "userId", userId.toString()));
        return ra;
    }

    @Transactional
    public ResourceAssignment update(UUID id, String role, LocalDate startDate, LocalDate endDate) {
        ResourceAssignment ra = assignmentRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("ResourceAssignment", id));
        if (role != null) ra.setRole(role);
        if (startDate != null) ra.setStartDate(startDate);
        if (endDate != null) ra.setEndDate(endDate);
        ra = assignmentRepository.save(ra);
        auditService.log("ResourceAssignment", ra.getId(), "UPDATE", Map.of());
        return ra;
    }

    @Transactional
    public void delete(UUID id) {
        ResourceAssignment ra = assignmentRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("ResourceAssignment", id));
        ra.setDeletedAt(Instant.now());
        assignmentRepository.save(ra);
    }
}
