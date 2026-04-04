package com.arqops.hr.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.hr.dto.AttendanceRequest;
import com.arqops.hr.dto.AttendanceResponse;
import com.arqops.hr.entity.Attendance;
import com.arqops.hr.entity.Employee;
import com.arqops.hr.repository.AttendanceRepository;
import com.arqops.hr.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final AuditService auditService;

    @Transactional
    public AttendanceResponse mark(AttendanceRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        ensureEmployee(request.employeeId());

        Attendance attendance = attendanceRepository
                .findByEmployeeIdAndAttendanceDate(request.employeeId(), request.date())
                .map(existing -> {
                    existing.setStatus(request.status());
                    if (request.checkInTime() != null) {
                        existing.setCheckInTime(request.checkInTime());
                    }
                    if (request.checkOutTime() != null) {
                        existing.setCheckOutTime(request.checkOutTime());
                    }
                    if (request.notes() != null) {
                        existing.setNotes(request.notes());
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    Attendance a = Attendance.builder()
                            .employeeId(request.employeeId())
                            .attendanceDate(request.date())
                            .status(request.status())
                            .checkInTime(request.checkInTime())
                            .checkOutTime(request.checkOutTime())
                            .notes(request.notes())
                            .build();
                    a.setTenantId(tenantId);
                    return a;
                });

        attendance = attendanceRepository.save(attendance);
        auditService.log("Attendance", attendance.getId(), "MARK", Map.of("date", request.date().toString()));
        return AttendanceResponse.from(attendance);
    }

    public List<AttendanceResponse> listByEmployeeAndRange(UUID employeeId, LocalDate from, LocalDate to) {
        ensureEmployee(employeeId);
        return attendanceRepository.findByEmployeeIdAndAttendanceDateBetweenOrderByAttendanceDateAsc(employeeId, from, to)
                .stream()
                .map(AttendanceResponse::from)
                .toList();
    }

    public List<AttendanceResponse> listByDateRange(LocalDate from, LocalDate to) {
        return attendanceRepository.findByAttendanceDateBetweenOrderByAttendanceDateAsc(from, to)
                .stream()
                .map(AttendanceResponse::from)
                .toList();
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
