package com.arqops.project.dto;

import com.arqops.project.entity.Milestone;
import com.arqops.project.entity.Project;
import com.arqops.project.entity.ProjectPhase;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ProjectResponse(
        UUID id,
        UUID clientId,
        UUID leadId,
        String name,
        String type,
        String location,
        String siteAddress,
        LocalDate startDate,
        LocalDate targetEndDate,
        BigDecimal value,
        String status,
        List<PhaseResponse> phases,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProjectResponse from(Project p, List<ProjectPhase> phaseEntities) {
        List<PhaseResponse> phases = phaseEntities.stream()
                .map(PhaseResponse::from)
                .toList();
        return new ProjectResponse(
                p.getId(),
                p.getClientId(),
                p.getLeadId(),
                p.getName(),
                p.getType(),
                p.getLocation(),
                p.getSiteAddress(),
                p.getStartDate(),
                p.getTargetEndDate(),
                p.getValue(),
                p.getStatus(),
                phases,
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }

    public static ProjectResponse from(Project p) {
        return from(p, List.of());
    }

    public record PhaseResponse(
            UUID id,
            String name,
            Integer displayOrder,
            LocalDate startDate,
            LocalDate endDate,
            List<MilestoneResponse> milestones,
            Instant createdAt
    ) {
        public static PhaseResponse from(ProjectPhase ph) {
            return new PhaseResponse(
                    ph.getId(),
                    ph.getName(),
                    ph.getDisplayOrder(),
                    ph.getStartDate(),
                    ph.getEndDate(),
                    ph.getMilestones().stream().map(MilestoneResponse::from).toList(),
                    ph.getCreatedAt()
            );
        }
    }

    public record MilestoneResponse(
            UUID id,
            String name,
            LocalDate targetDate,
            LocalDate actualDate,
            String status,
            String deliverables,
            Instant createdAt
    ) {
        public static MilestoneResponse from(Milestone m) {
            return new MilestoneResponse(
                    m.getId(),
                    m.getName(),
                    m.getTargetDate(),
                    m.getActualDate(),
                    m.getStatus(),
                    m.getDeliverables(),
                    m.getCreatedAt()
            );
        }
    }
}
