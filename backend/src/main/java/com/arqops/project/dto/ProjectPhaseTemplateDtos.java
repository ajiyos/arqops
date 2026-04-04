package com.arqops.project.dto;

import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

public final class ProjectPhaseTemplateDtos {

    private ProjectPhaseTemplateDtos() {}

    public record MilestoneTemplateEntry(String name, int displayOrder) {}

    public record PhaseTemplateEntry(
            String name,
            int displayOrder,
            List<MilestoneTemplateEntry> milestones) {
        public PhaseTemplateEntry {
            milestones = milestones != null ? milestones : List.of();
        }
    }

    public record OverviewResponse(Map<String, List<PhaseTemplateEntry>> templatesByType) {}

    public record PhaseTemplateItem(
            String name,
            List<String> milestones) {
        public PhaseTemplateItem {
            milestones = milestones != null ? milestones : List.of();
        }
    }

    /** {@code phases} may be omitted in JSON; treated as empty list (clears templates for that type). */
    public record ReplaceRequest(@Valid List<PhaseTemplateItem> phases) {
        public ReplaceRequest {
            phases = phases != null ? phases : List.of();
        }
    }
}
