package com.arqops.hr.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.hr.dto.LeaveTypeRequest;
import com.arqops.hr.dto.LeaveTypeResponse;
import com.arqops.hr.entity.LeaveType;
import com.arqops.hr.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LeaveTypeService {

    private final LeaveTypeRepository leaveTypeRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<LeaveTypeResponse> list() {
        return leaveTypeRepository.findAll().stream().map(LeaveTypeResponse::from).toList();
    }

    @Transactional
    public LeaveTypeResponse create(LeaveTypeRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        LeaveType lt = LeaveType.builder()
                .name(request.name())
                .annualQuota(request.annualQuota() != null ? request.annualQuota() : 0)
                .carryForwardLimit(request.carryForwardLimit() != null ? request.carryForwardLimit() : 0)
                .build();
        lt.setTenantId(tenantId);
        lt = leaveTypeRepository.save(lt);
        auditService.log("LeaveType", lt.getId(), "CREATE", Map.of("name", lt.getName()));
        return LeaveTypeResponse.from(lt);
    }

    @Transactional
    public LeaveTypeResponse update(UUID id, LeaveTypeRequest request) {
        LeaveType lt = leaveTypeRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("LeaveType", id));
        if (request.name() != null) lt.setName(request.name());
        if (request.annualQuota() != null) lt.setAnnualQuota(request.annualQuota());
        if (request.carryForwardLimit() != null) lt.setCarryForwardLimit(request.carryForwardLimit());
        lt = leaveTypeRepository.save(lt);
        auditService.log("LeaveType", lt.getId(), "UPDATE", Map.of("name", lt.getName()));
        return LeaveTypeResponse.from(lt);
    }

    @Transactional
    public void delete(UUID id) {
        LeaveType lt = leaveTypeRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("LeaveType", id));
        lt.setDeletedAt(Instant.now());
        leaveTypeRepository.save(lt);
        auditService.log("LeaveType", lt.getId(), "DELETE", Map.of("name", lt.getName()));
    }
}
