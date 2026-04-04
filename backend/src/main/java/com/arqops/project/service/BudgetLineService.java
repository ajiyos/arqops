package com.arqops.project.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.project.ProjectBudgetConstants;
import com.arqops.project.entity.Project;
import com.arqops.project.entity.ProjectBudgetLine;
import com.arqops.project.repository.ProjectBudgetLineRepository;
import com.arqops.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BudgetLineService {

    private final ProjectBudgetLineRepository budgetLineRepository;
    private final ProjectRepository projectRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<ProjectBudgetLine> listByProject(UUID projectId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        return budgetLineRepository.findByTenantIdAndProject_Id(tenantId, projectId);
    }

    @Transactional
    public ProjectBudgetLine create(UUID projectId, String category,
                                     BigDecimal budgetedAmount, BigDecimal actualAmount) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> AppException.notFound("Project", projectId));

        ProjectBudgetLine line = ProjectBudgetLine.builder()
                .project(project)
                .category(category)
                .budgetedAmount(budgetedAmount != null ? budgetedAmount : BigDecimal.ZERO)
                .actualAmount(actualAmount != null ? actualAmount : BigDecimal.ZERO)
                .build();
        line.setTenantId(tenantId);
        line = budgetLineRepository.save(line);
        auditService.log("ProjectBudgetLine", line.getId(), "CREATE",
                Map.of("category", category, "projectId", projectId.toString()));
        return line;
    }

    @Transactional
    public ProjectBudgetLine update(UUID id, String category,
                                     BigDecimal budgetedAmount, BigDecimal actualAmount) {
        ProjectBudgetLine line = budgetLineRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("ProjectBudgetLine", id));
        if (category != null) line.setCategory(category);
        if (budgetedAmount != null) line.setBudgetedAmount(budgetedAmount);
        if (actualAmount != null) line.setActualAmount(actualAmount);
        line = budgetLineRepository.save(line);
        auditService.log("ProjectBudgetLine", line.getId(), "UPDATE", Map.of("category", line.getCategory()));
        return line;
    }

    @Transactional
    public void delete(UUID id) {
        ProjectBudgetLine line = budgetLineRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("ProjectBudgetLine", id));
        line.setDeletedAt(Instant.now());
        budgetLineRepository.save(line);
    }

    /**
     * System use: sets {@link ProjectBudgetConstants#LABOR_TIMESHEET_CATEGORY} actual from HR timesheets.
     */
    @Transactional
    public void setLaborTimesheetActual(UUID projectId, BigDecimal actualAmount) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> AppException.notFound("Project", projectId));
        if (tenantId != null && !tenantId.equals(project.getTenantId())) {
            throw AppException.forbidden("Access denied");
        }
        BigDecimal actual = actualAmount != null ? actualAmount : BigDecimal.ZERO;
        List<ProjectBudgetLine> lines = budgetLineRepository.findByTenantIdAndProject_Id(tenantId, projectId);
        Optional<ProjectBudgetLine> labor = lines.stream()
                .filter(l -> ProjectBudgetConstants.LABOR_TIMESHEET_CATEGORY.equals(l.getCategory()))
                .findFirst();
        if (labor.isPresent()) {
            ProjectBudgetLine line = labor.get();
            line.setActualAmount(actual);
            budgetLineRepository.save(line);
            auditService.log("ProjectBudgetLine", line.getId(), "UPDATE",
                    Map.of("category", line.getCategory(), "source", "timesheet_rollup"));
        } else {
            ProjectBudgetLine line = ProjectBudgetLine.builder()
                    .project(project)
                    .category(ProjectBudgetConstants.LABOR_TIMESHEET_CATEGORY)
                    .budgetedAmount(BigDecimal.ZERO)
                    .actualAmount(actual)
                    .build();
            line.setTenantId(tenantId);
            line = budgetLineRepository.save(line);
            auditService.log("ProjectBudgetLine", line.getId(), "CREATE",
                    Map.of("category", ProjectBudgetConstants.LABOR_TIMESHEET_CATEGORY,
                            "projectId", projectId.toString()));
        }
    }
}
