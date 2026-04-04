package com.arqops.project.service;

import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.project.dto.ProjectPhaseTemplateDtos;
import com.arqops.project.entity.ProjectTypeMilestoneTemplate;
import com.arqops.project.entity.ProjectTypePhaseTemplate;
import com.arqops.project.repository.ProjectTypePhaseTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectTypePhaseTemplateService {

    private final ProjectTypePhaseTemplateRepository repository;

    @Transactional(readOnly = true)
    public Map<String, List<ProjectPhaseTemplateDtos.PhaseTemplateEntry>> listGroupedByType() {
        UUID tenantId = requireTenantId();
        List<ProjectTypePhaseTemplate> all = repository.findAllByTenantIdWithMilestones(tenantId);
        all.sort(Comparator.comparing(ProjectTypePhaseTemplate::getProjectType)
                .thenComparing(ProjectTypePhaseTemplate::getDisplayOrder));
        Map<String, List<ProjectPhaseTemplateDtos.PhaseTemplateEntry>> out = new LinkedHashMap<>();
        for (ProjectTypePhaseTemplate row : all) {
            List<ProjectPhaseTemplateDtos.MilestoneTemplateEntry> mEntries = new ArrayList<>();
            if (row.getMilestoneTemplates() != null) {
                row.getMilestoneTemplates().stream()
                        .sorted(Comparator.comparing(ProjectTypeMilestoneTemplate::getDisplayOrder))
                        .forEach(m -> mEntries.add(
                                new ProjectPhaseTemplateDtos.MilestoneTemplateEntry(
                                        m.getName(), m.getDisplayOrder())));
            }
            out.computeIfAbsent(row.getProjectType(), k -> new ArrayList<>())
                    .add(new ProjectPhaseTemplateDtos.PhaseTemplateEntry(
                            row.getPhaseName(), row.getDisplayOrder(), mEntries));
        }
        return out;
    }

    @Transactional
    public void replaceTemplatesForProjectType(
            String projectType, List<ProjectPhaseTemplateDtos.PhaseTemplateItem> phases) {
        UUID tenantId = requireTenantId();
        if (projectType == null || projectType.isBlank()) {
            throw AppException.badRequest("Project type is required");
        }
        String type = projectType.trim();
        repository.deleteByTenantIdAndProjectType(tenantId, type);
        if (phases == null || phases.isEmpty()) {
            return;
        }
        int phaseOrder = 0;
        for (ProjectPhaseTemplateDtos.PhaseTemplateItem item : phases) {
            if (item.name() == null || item.name().isBlank()) {
                continue;
            }
            ProjectTypePhaseTemplate ph = ProjectTypePhaseTemplate.builder()
                    .projectType(type)
                    .phaseName(item.name().trim())
                    .displayOrder(phaseOrder++)
                    .build();
            ph.setTenantId(tenantId);
            int milestoneOrder = 0;
            for (String raw : item.milestones()) {
                if (raw == null || raw.isBlank()) {
                    continue;
                }
                ProjectTypeMilestoneTemplate mt = ProjectTypeMilestoneTemplate.builder()
                        .name(raw.trim())
                        .displayOrder(milestoneOrder++)
                        .build();
                mt.setTenantId(tenantId);
                mt.setPhaseTemplate(ph);
                ph.getMilestoneTemplates().add(mt);
            }
            repository.save(ph);
        }
    }

    @Transactional(readOnly = true)
    public List<ProjectTypePhaseTemplate> findTemplatesForNewProject(UUID tenantId, String projectType) {
        if (tenantId == null || projectType == null || projectType.isBlank()) {
            return List.of();
        }
        List<ProjectTypePhaseTemplate> list =
                repository.findByTenantIdAndProjectTypeWithMilestones(tenantId, projectType.trim());
        list.sort(Comparator.comparing(ProjectTypePhaseTemplate::getDisplayOrder));
        return list;
    }

    private static UUID requireTenantId() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            throw AppException.forbidden("A workspace context is required");
        }
        return tenantId;
    }
}
