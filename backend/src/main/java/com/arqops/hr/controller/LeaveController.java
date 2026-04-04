package com.arqops.hr.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.hr.dto.LeaveRequestDto;
import com.arqops.hr.dto.LeaveResponse;
import com.arqops.hr.service.LeaveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr/leave-requests")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;

    @GetMapping
    @PreAuthorize("hasAuthority('hr.read')")
    public ResponseEntity<ApiResponse<List<LeaveResponse>>> list(
            @RequestParam(required = false) UUID employeeId,
            Pageable pageable) {
        Page<LeaveResponse> page = leaveService.list(employeeId, pageable);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('hr.write')")
    public ResponseEntity<ApiResponse<LeaveResponse>> apply(@Valid @RequestBody LeaveRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(leaveService.apply(request)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('hr.approve')")
    public ResponseEntity<ApiResponse<LeaveResponse>> approve(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(leaveService.approve(id)));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('hr.approve')")
    public ResponseEntity<ApiResponse<LeaveResponse>> reject(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(leaveService.reject(id)));
    }
}
