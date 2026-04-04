package com.arqops.project.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.project.dto.ProjectBudgetResponse;
import com.arqops.project.dto.ProjectRequest;
import com.arqops.project.dto.ProjectResponse;
import com.arqops.project.entity.Milestone;
import com.arqops.project.entity.Project;
import com.arqops.project.entity.ProjectPhase;
import com.arqops.project.entity.ProjectTypeMilestoneTemplate;
import com.arqops.project.entity.ProjectTypePhaseTemplate;
import com.arqops.project.entity.ProjectTypeTaskTemplate;
import com.arqops.project.entity.Task;
import com.arqops.project.repository.MilestoneRepository;
import com.arqops.project.repository.ProjectBudgetLineRepository;
import com.arqops.project.repository.ProjectPhaseRepository;
import com.arqops.project.repository.ProjectRepository;
import com.arqops.project.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectPhaseRepository projectPhaseRepository;
    private final MilestoneRepository milestoneRepository;
    private final ProjectBudgetLineRepository projectBudgetLineRepository;
    private final ProjectTypePhaseTemplateService projectTypePhaseTemplateService;
    private final ProjectTypeTaskTemplateService projectTypeTaskTemplateService;
    private final TaskRepository taskRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public Page<ProjectResponse> list(Pageable pageable, String query) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Page<Project> page = (query == null || query.isBlank())
                ? projectRepository.findByTenantId(tenantId, pageable)
                : projectRepository.searchByTenantId(tenantId, query.trim(), pageable);
        return page.map(ProjectResponse::from);
    }

    @Transactional(readOnly = true)
    public ProjectResponse getById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Project", id));
        assertTenant(project, tenantId);
        var phases = projectPhaseRepository.findByTenantIdAndProject_IdOrderByDisplayOrderAsc(tenantId, id);
        phases.forEach(ph -> ph.getMilestones().size());
        return ProjectResponse.from(project, phases);
    }

    @Transactional
    public ProjectResponse create(ProjectRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Project project = Project.builder()
                .clientId(request.clientId())
                .leadId(request.leadId())
                .name(request.name())
                .type(request.type())
                .location(request.location())
                .siteAddress(request.siteAddress())
                .startDate(request.startDate())
                .targetEndDate(request.targetEndDate())
                .value(request.value())
                .status(request.status() != null ? request.status() : "active")
                .build();
        project.setTenantId(tenantId);
        project = projectRepository.save(project);
        if (request.phases() != null && !request.phases().isEmpty()) {
            savePhases(tenantId, project, request.phases());
        } else if (request.type() != null && !request.type().isBlank()) {
            applyDefaultPhasesFromTemplates(tenantId, project, request.type().trim());
        }
        if (request.type() != null && !request.type().isBlank()) {
            applyDefaultTasksFromTemplates(tenantId, project, request.type().trim());
        }
        auditService.log("Project", project.getId(), "CREATE", Map.of("name", project.getName()));
        return getById(project.getId());
    }

    @Transactional
    public ProjectResponse update(UUID id, ProjectRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Project", id));
        assertTenant(project, tenantId);
        project.setClientId(request.clientId());
        project.setLeadId(request.leadId());
        project.setName(request.name());
        project.setType(request.type());
        project.setLocation(request.location());
        project.setSiteAddress(request.siteAddress());
        project.setStartDate(request.startDate());
        project.setTargetEndDate(request.targetEndDate());
        project.setValue(request.value());
        if (request.status() != null) {
            project.setStatus(request.status());
        }
        project = projectRepository.save(project);
        if (request.phases() != null) {
            softDeleteExistingPhases(tenantId, id);
            savePhases(tenantId, project, request.phases());
        }
        auditService.log("Project", project.getId(), "UPDATE", Map.of("name", project.getName()));
        return getById(project.getId());
    }

    @Transactional
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Project", id));
        assertTenant(project, tenantId);
        Instant now = Instant.now();
        softDeleteExistingPhases(tenantId, id);
        project.setDeletedAt(now);
        projectRepository.save(project);
        auditService.log("Project", project.getId(), "DELETE", Map.of());
    }

    @Transactional(readOnly = true)
    public ProjectBudgetResponse getBudget(UUID projectId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> AppException.notFound("Project", projectId));
        assertTenant(project, tenantId);
        var lines = projectBudgetLineRepository.findByTenantIdAndProject_Id(tenantId, projectId);
        return ProjectBudgetResponse.of(projectId, lines);
    }

    private void assertTenant(Project project, UUID tenantId) {
        if (tenantId != null && !tenantId.equals(project.getTenantId())) {
            throw AppException.forbidden("Access denied");
        }
    }

    private void softDeleteExistingPhases(UUID tenantId, UUID projectId) {
        Instant now = Instant.now();
        var phases = projectPhaseRepository.findByTenantIdAndProject_IdOrderByDisplayOrderAsc(tenantId, projectId);
        for (ProjectPhase ph : phases) {
            for (Milestone m : new ArrayList<>(ph.getMilestones())) {
                m.setDeletedAt(now);
                milestoneRepository.save(m);
            }
            ph.setDeletedAt(now);
            projectPhaseRepository.save(ph);
        }
    }

    private void applyDefaultPhasesFromTemplates(UUID tenantId, Project project, String projectType) {
        var templates = projectTypePhaseTemplateService.findTemplatesForNewProject(tenantId, projectType);
        if (templates.isEmpty()) {
            return;
        }
        List<ProjectRequest.PhaseInput> inputs = new ArrayList<>();
        for (ProjectTypePhaseTemplate row : templates) {
            List<ProjectRequest.MilestoneInput> mInputs = new ArrayList<>();
            List<ProjectTypeMilestoneTemplate> ms = new ArrayList<>(row.getMilestoneTemplates());
            ms.sort(Comparator.comparing(ProjectTypeMilestoneTemplate::getDisplayOrder));
            for (ProjectTypeMilestoneTemplate m : ms) {
                mInputs.add(new ProjectRequest.MilestoneInput(
                        m.getName(), null, null, "pending", null));
            }
            inputs.add(new ProjectRequest.PhaseInput(
                    row.getPhaseName(),
                    row.getDisplayOrder(),
                    null,
                    null,
                    mInputs.isEmpty() ? null : mInputs));
        }
        savePhases(tenantId, project, inputs);
    }

    private void applyDefaultTasksFromTemplates(UUID tenantId, Project project, String projectType) {
        List<ProjectTypeTaskTemplate> templates =
                projectTypeTaskTemplateService.findTemplatesForNewProject(tenantId, projectType);
        if (templates.isEmpty()) {
            return;
        }
        UUID projectId = project.getId();
        for (ProjectTypeTaskTemplate row : templates) {
            Task task = Task.builder()
                    .project(project)
                    .title(row.getTitle())
                    .description(row.getDescription())
                    .priority(row.getPriority() != null ? row.getPriority() : "medium")
                    .status(row.getStatus() != null ? row.getStatus() : "todo")
                    .build();
            task.setTenantId(tenantId);
            task = taskRepository.save(task);
            auditService.log("Task", task.getId(), "CREATE", Map.of("projectId", projectId.toString()));
        }
    }

    private void savePhases(UUID tenantId, Project project, List<ProjectRequest.PhaseInput> phaseInputs) {
        for (ProjectRequest.PhaseInput pi : phaseInputs) {
            ProjectPhase phase = ProjectPhase.builder()
                    .project(project)
                    .name(pi.name())
                    .displayOrder(pi.displayOrder() != null ? pi.displayOrder() : 0)
                    .startDate(pi.startDate())
                    .endDate(pi.endDate())
                    .build();
            phase.setTenantId(tenantId);
            phase = projectPhaseRepository.save(phase);
            if (pi.milestones() != null) {
                for (ProjectRequest.MilestoneInput mi : pi.milestones()) {
                    Milestone milestone = Milestone.builder()
                            .phase(phase)
                            .name(mi.name())
                            .targetDate(mi.targetDate())
                            .actualDate(mi.actualDate())
                            .status(mi.status() != null ? mi.status() : "pending")
                            .deliverables(mi.deliverables())
                            .build();
                    milestone.setTenantId(tenantId);
                    milestoneRepository.save(milestone);
                }
            }
        }
    }
}
