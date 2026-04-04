package com.arqops.hr.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.hr.dto.AttendanceRequest;
import com.arqops.hr.dto.AttendanceResponse;
import com.arqops.hr.service.AttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping
    @PreAuthorize("hasAuthority('hr.read')")
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> list(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (employeeId != null) {
            return ResponseEntity.ok(ApiResponse.success(
                    attendanceService.listByEmployeeAndRange(employeeId, from, to)));
        }
        return ResponseEntity.ok(ApiResponse.success(
                attendanceService.listByDateRange(from, to)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('hr.write')")
    public ResponseEntity<ApiResponse<AttendanceResponse>> mark(@Valid @RequestBody AttendanceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(attendanceService.mark(request)));
    }
}
