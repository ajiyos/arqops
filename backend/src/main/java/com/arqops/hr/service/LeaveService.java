package com.arqops.hr.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.security.UserPrincipal;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.hr.dto.LeaveRequestDto;
import com.arqops.hr.dto.LeaveResponse;
import com.arqops.hr.entity.Employee;
import com.arqops.hr.entity.LeaveRequest;
import com.arqops.hr.repository.EmployeeRepository;
import com.arqops.hr.repository.LeaveRequestRepository;
import com.arqops.hr.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LeaveService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final EmployeeRepository employeeRepository;
    private final AuditService auditService;

    public Page<LeaveResponse> list(UUID employeeId, Pageable pageable) {
        if (employeeId != null) {
            ensureEmployee(employeeId);
            return leaveRequestRepository.findByEmployeeId(employeeId, pageable).map(LeaveResponse::from);
        }
        return leaveRequestRepository.findAll(pageable).map(LeaveResponse::from);
    }

    @Transactional
    public LeaveResponse apply(LeaveRequestDto dto) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        ensureEmployee(dto.employeeId());
        leaveTypeRepository.findById(dto.leaveTypeId())
                .orElseThrow(() -> AppException.notFound("LeaveType", dto.leaveTypeId()));

        LeaveRequest lr = LeaveRequest.builder()
                .employeeId(dto.employeeId())
                .leaveTypeId(dto.leaveTypeId())
                .startDate(dto.startDate())
                .endDate(dto.endDate())
                .days(dto.days())
                .reason(dto.reason())
                .status("pending")
                .build();
        lr.setTenantId(tenantId);
        lr = leaveRequestRepository.save(lr);
        auditService.log("LeaveRequest", lr.getId(), "APPLY", Map.of("days", dto.days().toString()));
        return LeaveResponse.from(lr);
    }

    @Transactional
    public LeaveResponse approve(UUID id) {
        return setDecision(id, "approved");
    }

    @Transactional
    public LeaveResponse reject(UUID id) {
        return setDecision(id, "rejected");
    }

    private LeaveResponse setDecision(UUID id, String status) {
        LeaveRequest lr = leaveRequestRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("LeaveRequest", id));
        if (!"pending".equals(lr.getStatus())) {
            throw AppException.badRequest("Leave request is not pending");
        }
        UUID approverId = currentUserId();
        lr.setStatus(status);
        lr.setApprovedBy(approverId);
        lr = leaveRequestRepository.save(lr);
        auditService.log("LeaveRequest", lr.getId(), status.toUpperCase(), Map.of("approvedBy", String.valueOf(approverId)));
        return LeaveResponse.from(lr);
    }

    private UUID currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.userId();
        }
        throw AppException.unauthorized("Not authenticated");
    }

    private void ensureEmployee(UUID employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> AppException.notFound("Employee", employeeId));
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId != null && !tenantId.equals(employee.getTenantId())) {
            throw AppException.forbidden("Access denied");
        }
    }
}
