package com.arqops.hr.service;

import com.arqops.common.tenancy.TenantContext;
import com.arqops.hr.entity.Employee;
import com.arqops.hr.entity.TimeEntry;
import com.arqops.hr.repository.EmployeeRepository;
import com.arqops.hr.repository.TimeEntryRepository;
import com.arqops.project.service.BudgetLineService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TimesheetLaborRollupService {

    private final TimeEntryRepository timeEntryRepository;
    private final EmployeeRepository employeeRepository;
    private final TenantDesignationHourlyRateService designationHourlyRateService;
    private final BudgetLineService budgetLineService;

    @Transactional
    public void recalculateLaborForProjects(Collection<UUID> projectIds) {
        if (projectIds == null || projectIds.isEmpty()) {
            return;
        }
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            return;
        }
        for (UUID projectId : projectIds) {
            if (projectId == null) {
                continue;
            }
            BigDecimal total = BigDecimal.ZERO;
            for (TimeEntry te : timeEntryRepository.findByTenantIdAndProjectIdAndBillableTrue(tenantId, projectId)) {
                Employee emp = employeeRepository.findById(te.getEmployeeId()).orElse(null);
                if (emp == null) {
                    continue;
                }
                BigDecimal rate = designationHourlyRateService
                        .resolveHourlyRate(tenantId, emp.getDesignation())
                        .orElse(BigDecimal.ZERO);
                total = total.add(te.getHours().multiply(rate));
            }
            budgetLineService.setLaborTimesheetActual(projectId, total);
        }
    }
}
