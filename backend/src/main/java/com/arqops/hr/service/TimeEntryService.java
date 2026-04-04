package com.arqops.hr.service;

import com.arqops.common.exception.AppException;
import com.arqops.common.security.UserPrincipal;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.hr.dto.TimeEntryDtos;
import com.arqops.hr.entity.Employee;
import com.arqops.hr.entity.TimeEntry;
import com.arqops.hr.repository.EmployeeRepository;
import com.arqops.hr.repository.TimeEntryRepository;
import com.arqops.project.entity.Project;
import com.arqops.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TimeEntryService {

    private static final BigDecimal MAX_HOURS_PER_DAY = new BigDecimal("24");

    private final TimeEntryRepository timeEntryRepository;
    private final EmployeeRepository employeeRepository;
    private final ProjectRepository projectRepository;
    private final TimesheetLaborRollupService timesheetLaborRollupService;

    @Transactional(readOnly = true)
    public List<TimeEntryDtos.EntryResponse> list(LocalDate from, LocalDate to, UUID employeeIdParam) {
        UUID tenantId = requireTenantId();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UUID employeeId = resolveEmployeeId(employeeIdParam, auth);
        if (to.isBefore(from)) {
            throw AppException.badRequest("End date must be on or after start date");
        }
        return timeEntryRepository
                .findByTenantIdAndEmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(tenantId, employeeId, from, to)
                .stream()
                .map(TimeEntryDtos.EntryResponse::from)
                .toList();
    }

    @Transactional
    public List<TimeEntryDtos.EntryResponse> sync(TimeEntryDtos.SyncRequest request) {
        UUID tenantId = requireTenantId();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UUID employeeId = resolveEmployeeId(request.employeeId(), auth);
        LocalDate from = request.from();
        LocalDate to = request.to();
        if (to.isBefore(from)) {
            throw AppException.badRequest("End date must be on or after start date");
        }

        List<TimeEntry> existing = timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(
                tenantId, employeeId, from, to);
        Set<UUID> touchedProjects = new HashSet<>();
        for (TimeEntry e : existing) {
            if (e.isBillable() && e.getProjectId() != null) {
                touchedProjects.add(e.getProjectId());
            }
        }

        validateEntriesForSync(tenantId, from, to, request.entries());

        timeEntryRepository.softDeleteInRange(tenantId, employeeId, from, to, Instant.now());

        for (TimeEntryDtos.EntryItem item : request.entries()) {
            boolean billable = item.projectId() != null && item.billable();
            TimeEntry te = TimeEntry.builder()
                    .employeeId(employeeId)
                    .projectId(item.projectId())
                    .workDate(item.workDate())
                    .hours(item.hours())
                    .billable(billable)
                    .notes(item.notes())
                    .build();
            te.setTenantId(tenantId);
            timeEntryRepository.save(te);
            if (billable && item.projectId() != null) {
                touchedProjects.add(item.projectId());
            }
        }

        timesheetLaborRollupService.recalculateLaborForProjects(touchedProjects);

        return timeEntryRepository
                .findByTenantIdAndEmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(tenantId, employeeId, from, to)
                .stream()
                .map(TimeEntryDtos.EntryResponse::from)
                .toList();
    }

    private void validateEntriesForSync(UUID tenantId, LocalDate from, LocalDate to, List<TimeEntryDtos.EntryItem> entries) {
        Map<LocalDate, BigDecimal> perDay = new HashMap<>();
        for (TimeEntryDtos.EntryItem item : entries) {
            if (item.workDate().isBefore(from) || item.workDate().isAfter(to)) {
                throw AppException.badRequest("Each entry work date must fall within the sync range");
            }
            validateProject(tenantId, item.projectId());
            perDay.merge(item.workDate(), item.hours(), BigDecimal::add);
        }
        for (Map.Entry<LocalDate, BigDecimal> e : perDay.entrySet()) {
            if (e.getValue().compareTo(MAX_HOURS_PER_DAY) > 0) {
                throw AppException.badRequest("Total hours per day cannot exceed 24");
            }
        }
    }

    private void validateProject(UUID tenantId, UUID projectId) {
        if (projectId == null) {
            return;
        }
        Project p = projectRepository.findById(projectId).orElseThrow(() -> AppException.notFound("Project", projectId));
        if (!tenantId.equals(p.getTenantId())) {
            throw AppException.badRequest("Project does not belong to this workspace");
        }
    }

    private UUID resolveEmployeeId(UUID requested, Authentication auth) {
        UUID userId = currentUserId();
        if (requested == null) {
            return employeeRepository
                    .findByUserId(userId)
                    .map(Employee::getId)
                    .orElseThrow(() -> AppException.badRequest("No employee record for current user"));
        }
        if (!isTimesheetManager(auth)) {
            UUID self = employeeRepository
                    .findByUserId(userId)
                    .map(Employee::getId)
                    .orElseThrow(() -> AppException.badRequest("No employee record for current user"));
            if (!self.equals(requested)) {
                throw AppException.forbidden("You can only access your own timesheet");
            }
        }
        Employee e = employeeRepository.findById(requested).orElseThrow(() -> AppException.notFound("Employee", requested));
        UUID tid = TenantContext.getCurrentTenantId();
        if (tid != null && !tid.equals(e.getTenantId())) {
            throw AppException.forbidden("Access denied");
        }
        return requested;
    }

    private static boolean isTimesheetManager(Authentication auth) {
        if (auth == null) {
            return false;
        }
        if (auth.getPrincipal() instanceof UserPrincipal p) {
            if (p.roles().contains("TENANT_ADMIN") || p.roles().contains("HR_ADMIN")) {
                return true;
            }
        }
        return auth.getAuthorities().stream().anyMatch(a -> "hr.approve".equals(a.getAuthority()));
    }

    private static UUID currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.userId();
        }
        throw AppException.unauthorized("Not authenticated");
    }

    private static UUID requireTenantId() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            throw AppException.forbidden("A workspace context is required");
        }
        return tenantId;
    }
}
