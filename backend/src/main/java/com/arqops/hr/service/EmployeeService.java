package com.arqops.hr.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.encryption.EncryptionService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.hr.dto.EmployeeRequest;
import com.arqops.hr.dto.EmployeeResponse;
import com.arqops.hr.entity.Employee;
import com.arqops.hr.repository.EmployeeRepository;
import com.arqops.iam.entity.User;
import com.arqops.iam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final EncryptionService encryptionService;
    private final TenantDesignationHourlyRateService designationHourlyRateService;

    public Page<EmployeeResponse> list(Pageable pageable) {
        return employeeRepository.findAll(pageable).map(this::toResponse);
    }

    public EmployeeResponse get(UUID id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Employee", id));
        assertTenant(employee);
        return toResponse(employee);
    }

    @Transactional
    public EmployeeResponse create(EmployeeRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (request.name() == null || request.name().isBlank()) {
            throw AppException.badRequest("Name is required");
        }
        if (request.userId() != null) {
            validateLinkedUser(request.userId(), null);
        }
        if (request.reportingManagerId() != null) {
            validateReportingManager(request.reportingManagerId(), null);
        }
        designationHourlyRateService.assertActiveDesignation(tenantId, request.designation());

        Employee employee = Employee.builder()
                .userId(request.userId())
                .employeeCode(request.employeeCode())
                .name(request.name())
                .designation(request.designation())
                .department(request.department())
                .dateOfJoining(request.dateOfJoining())
                .reportingManagerId(request.reportingManagerId())
                .salaryStructureJson(request.salaryStructureJson())
                .phone(request.phone())
                .personalEmail(request.personalEmail())
                .emergencyContactName(request.emergencyContactName())
                .emergencyContactPhone(request.emergencyContactPhone())
                .emergencyContactRelation(request.emergencyContactRelation())
                .panEncrypted(encryptionService.encrypt(request.pan()))
                .status(request.status() != null ? request.status() : "active")
                .build();
        employee.setTenantId(tenantId);
        employee = employeeRepository.save(employee);
        auditService.log("Employee", employee.getId(), "CREATE", Map.of("name", employee.getName()));
        return toResponse(employee);
    }

    @Transactional
    public EmployeeResponse update(UUID id, EmployeeRequest request) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Employee", id));
        assertTenant(employee);

        if (request.name() != null) {
            if (request.name().isBlank()) {
                throw AppException.badRequest("Name cannot be blank");
            }
            employee.setName(request.name());
        }
        if (request.userId() != null) {
            validateLinkedUser(request.userId(), id);
            employee.setUserId(request.userId());
        }
        if (request.employeeCode() != null) {
            employee.setEmployeeCode(request.employeeCode());
        }
        if (request.designation() != null) {
            if (request.designation().isBlank()) {
                throw AppException.badRequest("Designation cannot be blank");
            }
            designationHourlyRateService.assertActiveDesignation(employee.getTenantId(), request.designation());
            employee.setDesignation(request.designation());
        }
        if (request.department() != null) {
            employee.setDepartment(request.department());
        }
        if (request.dateOfJoining() != null) {
            employee.setDateOfJoining(request.dateOfJoining());
        }
        if (request.reportingManagerId() != null) {
            validateReportingManager(request.reportingManagerId(), id);
            employee.setReportingManagerId(request.reportingManagerId());
        }
        if (request.salaryStructureJson() != null) {
            employee.setSalaryStructureJson(request.salaryStructureJson());
        }
        if (request.phone() != null) {
            employee.setPhone(request.phone());
        }
        if (request.personalEmail() != null) {
            employee.setPersonalEmail(request.personalEmail());
        }
        if (request.emergencyContactName() != null) {
            employee.setEmergencyContactName(request.emergencyContactName());
        }
        if (request.emergencyContactPhone() != null) {
            employee.setEmergencyContactPhone(request.emergencyContactPhone());
        }
        if (request.emergencyContactRelation() != null) {
            employee.setEmergencyContactRelation(request.emergencyContactRelation());
        }
        if (request.pan() != null) {
            employee.setPanEncrypted(encryptionService.encrypt(request.pan()));
        }
        if (request.status() != null) {
            employee.setStatus(request.status());
        }

        employee = employeeRepository.save(employee);
        auditService.log("Employee", employee.getId(), "UPDATE", Map.of("fields", "updated"));
        return toResponse(employee);
    }

    @Transactional
    public void delete(UUID id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Employee", id));
        assertTenant(employee);
        employee.setDeletedAt(java.time.Instant.now());
        employeeRepository.save(employee);
        auditService.log("Employee", employee.getId(), "DELETE", Map.of("name", employee.getName()));
    }

    private EmployeeResponse toResponse(Employee employee) {
        String userEmail = null;
        String userName = null;
        if (employee.getUserId() != null) {
            User user = userRepository.findById(employee.getUserId()).orElse(null);
            if (user != null) {
                userEmail = user.getEmail();
                userName = user.getName();
            }
        }
        return EmployeeResponse.from(employee, userEmail, userName);
    }

    private void validateLinkedUser(UUID userId, UUID currentEmployeeId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
        if (!user.getTenantId().equals(tenantId)) {
            throw AppException.badRequest("User does not belong to this tenant");
        }
        employeeRepository.findByUserId(userId).ifPresent(existing -> {
            if (currentEmployeeId == null || !existing.getId().equals(currentEmployeeId)) {
                throw AppException.conflict("User is already linked to employee: " + existing.getName());
            }
        });
    }

    private void assertTenant(Employee employee) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId != null && !tenantId.equals(employee.getTenantId())) {
            throw AppException.forbidden("Access denied");
        }
    }

    private void validateReportingManager(UUID managerId, UUID selfId) {
        if (selfId != null && managerId.equals(selfId)) {
            throw AppException.badRequest("Employee cannot report to themselves");
        }
        Employee manager = employeeRepository.findById(managerId)
                .orElseThrow(() -> AppException.notFound("Employee", managerId));
        assertTenant(manager);
    }
}
