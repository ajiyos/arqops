package com.arqops.project.dto;

import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

public final class ProjectTaskTemplateDtos {

    private ProjectTaskTemplateDtos() {}

    public record TaskTemplateEntry(
            String title,
            String description,
            String priority,
            String status,
            int displayOrder) {}

    public record TaskTemplatesOverviewResponse(Map<String, List<TaskTemplateEntry>> taskTemplatesByType) {}

    public record TaskTemplateItem(
            String title,
            String description,
            String priority,
            String status) {
        public TaskTemplateItem {
            description = description != null ? description : "";
        }
    }

    public record TaskTemplatesReplaceRequest(@Valid List<TaskTemplateItem> tasks) {
        public TaskTemplatesReplaceRequest {
            tasks = tasks != null ? tasks : List.of();
        }
    }
}
