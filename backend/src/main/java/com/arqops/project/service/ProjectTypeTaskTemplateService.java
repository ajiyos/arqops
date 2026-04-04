package com.arqops.project.service;

import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.project.dto.ProjectTaskTemplateDtos;
import com.arqops.project.entity.ProjectTypeTaskTemplate;
import com.arqops.project.repository.ProjectTypeTaskTemplateRepository;
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
public class ProjectTypeTaskTemplateService {

    private final ProjectTypeTaskTemplateRepository repository;

    @Transactional(readOnly = true)
    public Map<String, List<ProjectTaskTemplateDtos.TaskTemplateEntry>> listGroupedByType() {
        UUID tenantId = requireTenantId();
        List<ProjectTypeTaskTemplate> all =
                repository.findByTenantIdOrderByProjectTypeAscDisplayOrderAsc(tenantId);
        all.sort(Comparator.comparing(ProjectTypeTaskTemplate::getProjectType)
                .thenComparing(ProjectTypeTaskTemplate::getDisplayOrder));
        Map<String, List<ProjectTaskTemplateDtos.TaskTemplateEntry>> out = new LinkedHashMap<>();
        for (ProjectTypeTaskTemplate row : all) {
            out.computeIfAbsent(row.getProjectType(), k -> new ArrayList<>())
                    .add(new ProjectTaskTemplateDtos.TaskTemplateEntry(
                            row.getTitle(),
                            row.getDescription() != null ? row.getDescription() : "",
                            row.getPriority(),
                            row.getStatus(),
                            row.getDisplayOrder()));
        }
        return out;
    }

    @Transactional
    public void replaceTaskTemplatesForProjectType(
            String projectType, List<ProjectTaskTemplateDtos.TaskTemplateItem> tasks) {
        UUID tenantId = requireTenantId();
        if (projectType == null || projectType.isBlank()) {
            throw AppException.badRequest("Project type is required");
        }
        String type = projectType.trim();
        repository.deleteByTenantIdAndProjectType(tenantId, type);
        if (tasks == null || tasks.isEmpty()) {
            return;
        }
        int order = 0;
        for (ProjectTaskTemplateDtos.TaskTemplateItem item : tasks) {
            if (item.title() == null || item.title().isBlank()) {
                continue;
            }
            String priority = item.priority() != null && !item.priority().isBlank()
                    ? item.priority().trim()
                    : "medium";
            String status = item.status() != null && !item.status().isBlank()
                    ? item.status().trim()
                    : "todo";
            ProjectTypeTaskTemplate row = ProjectTypeTaskTemplate.builder()
                    .projectType(type)
                    .title(item.title().trim())
                    .description(item.description() != null && !item.description().isBlank()
                            ? item.description().trim()
                            : null)
                    .priority(priority)
                    .status(status)
                    .displayOrder(order++)
                    .build();
            row.setTenantId(tenantId);
            repository.save(row);
        }
    }

    @Transactional(readOnly = true)
    public List<ProjectTypeTaskTemplate> findTemplatesForNewProject(UUID tenantId, String projectType) {
        if (tenantId == null || projectType == null || projectType.isBlank()) {
            return List.of();
        }
        List<ProjectTypeTaskTemplate> list =
                repository.findByTenantIdAndProjectTypeOrderByDisplayOrderAsc(tenantId, projectType.trim());
        list.sort(Comparator.comparing(ProjectTypeTaskTemplate::getDisplayOrder));
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
