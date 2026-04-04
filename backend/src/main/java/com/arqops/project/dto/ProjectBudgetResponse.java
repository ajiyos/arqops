package com.arqops.project.dto;

import com.arqops.project.entity.ProjectBudgetLine;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ProjectBudgetResponse(
        UUID projectId,
        List<LineResponse> lines,
        BigDecimal totalBudgeted,
        BigDecimal totalActual
) {
    public record LineResponse(
            UUID id,
            String category,
            BigDecimal budgetedAmount,
            BigDecimal actualAmount
    ) {
        public static LineResponse from(ProjectBudgetLine line) {
            return new LineResponse(
                    line.getId(),
                    line.getCategory(),
                    line.getBudgetedAmount(),
                    line.getActualAmount()
            );
        }
    }

    public static ProjectBudgetResponse of(UUID projectId, List<ProjectBudgetLine> lines) {
        BigDecimal totalB = BigDecimal.ZERO;
        BigDecimal totalA = BigDecimal.ZERO;
        for (ProjectBudgetLine l : lines) {
            if (l.getBudgetedAmount() != null) {
                totalB = totalB.add(l.getBudgetedAmount());
            }
            if (l.getActualAmount() != null) {
                totalA = totalA.add(l.getActualAmount());
            }
        }
        return new ProjectBudgetResponse(
                projectId,
                lines.stream().map(LineResponse::from).toList(),
                totalB,
                totalA
        );
    }
}
