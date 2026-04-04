package com.arqops.project.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.project.dto.MilestoneRequest;
import com.arqops.project.dto.PhaseRequest;
import com.arqops.project.dto.ProjectResponse;
import com.arqops.project.entity.Milestone;
import com.arqops.project.entity.Project;
import com.arqops.project.entity.ProjectPhase;
import com.arqops.project.repository.MilestoneRepository;
import com.arqops.project.repository.ProjectPhaseRepository;
import com.arqops.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PhaseService {

    private final ProjectRepository projectRepository;
    private final ProjectPhaseRepository phaseRepository;
    private final MilestoneRepository milestoneRepository;
    private final AuditService auditService;

    @Transactional
    public ProjectResponse.PhaseResponse createPhase(UUID projectId, PhaseRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> AppException.notFound("Project", projectId));
        assertTenant(project.getTenantId(), tenantId);

        ProjectPhase phase = ProjectPhase.builder()
                .project(project)
                .name(request.name())
                .displayOrder(request.displayOrder() != null ? request.displayOrder() : 0)
                .startDate(request.startDate())
                .endDate(request.endDate())
                .build();
        phase.setTenantId(tenantId);
        phase = phaseRepository.save(phase);
        auditService.log("ProjectPhase", phase.getId(), "CREATE", Map.of("name", request.name()));
        return ProjectResponse.PhaseResponse.from(phase);
    }

    @Transactional
    public ProjectResponse.PhaseResponse updatePhase(UUID phaseId, PhaseRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        ProjectPhase phase = phaseRepository.findById(phaseId)
                .orElseThrow(() -> AppException.notFound("ProjectPhase", phaseId));
        assertTenant(phase.getTenantId(), tenantId);

        if (request.name() != null) phase.setName(request.name());
        if (request.displayOrder() != null) phase.setDisplayOrder(request.displayOrder());
        if (request.startDate() != null) phase.setStartDate(request.startDate());
        if (request.endDate() != null) phase.setEndDate(request.endDate());

        phase = phaseRepository.save(phase);
        auditService.log("ProjectPhase", phase.getId(), "UPDATE", Map.of("name", phase.getName()));
        return ProjectResponse.PhaseResponse.from(phase);
    }

    @Transactional
    public void deletePhase(UUID phaseId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        ProjectPhase phase = phaseRepository.findById(phaseId)
                .orElseThrow(() -> AppException.notFound("ProjectPhase", phaseId));
        assertTenant(phase.getTenantId(), tenantId);

        Instant now = Instant.now();
        for (Milestone m : phase.getMilestones()) {
            m.setDeletedAt(now);
            milestoneRepository.save(m);
        }
        phase.setDeletedAt(now);
        phaseRepository.save(phase);
        auditService.log("ProjectPhase", phase.getId(), "DELETE", Map.of("name", phase.getName()));
    }

    @Transactional
    public ProjectResponse.MilestoneResponse createMilestone(UUID phaseId, MilestoneRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        ProjectPhase phase = phaseRepository.findById(phaseId)
                .orElseThrow(() -> AppException.notFound("ProjectPhase", phaseId));
        assertTenant(phase.getTenantId(), tenantId);

        Milestone milestone = Milestone.builder()
                .phase(phase)
                .name(request.name())
                .targetDate(request.targetDate())
                .actualDate(request.actualDate())
                .status(request.status() != null ? request.status() : "pending")
                .deliverables(request.deliverables())
                .build();
        milestone.setTenantId(tenantId);
        milestone = milestoneRepository.save(milestone);
        auditService.log("Milestone", milestone.getId(), "CREATE", Map.of("name", request.name()));
        return ProjectResponse.MilestoneResponse.from(milestone);
    }

    @Transactional
    public ProjectResponse.MilestoneResponse updateMilestone(UUID milestoneId, MilestoneRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> AppException.notFound("Milestone", milestoneId));
        assertTenant(milestone.getTenantId(), tenantId);

        if (request.name() != null) milestone.setName(request.name());
        if (request.targetDate() != null) milestone.setTargetDate(request.targetDate());
        if (request.actualDate() != null) milestone.setActualDate(request.actualDate());
        if (request.status() != null) milestone.setStatus(request.status());
        if (request.deliverables() != null) milestone.setDeliverables(request.deliverables());

        milestone = milestoneRepository.save(milestone);
        auditService.log("Milestone", milestone.getId(), "UPDATE", Map.of("name", milestone.getName()));
        return ProjectResponse.MilestoneResponse.from(milestone);
    }

    @Transactional
    public void deleteMilestone(UUID milestoneId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> AppException.notFound("Milestone", milestoneId));
        assertTenant(milestone.getTenantId(), tenantId);

        milestone.setDeletedAt(Instant.now());
        milestoneRepository.save(milestone);
        auditService.log("Milestone", milestone.getId(), "DELETE", Map.of("name", milestone.getName()));
    }

    private void assertTenant(UUID entityTenantId, UUID currentTenantId) {
        if (currentTenantId != null && !currentTenantId.equals(entityTenantId)) {
            throw AppException.forbidden("Access denied");
        }
    }
}
