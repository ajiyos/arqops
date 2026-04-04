package com.arqops.hr.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.hr.dto.ReimbursementRequest;
import com.arqops.hr.dto.ReimbursementResponse;
import com.arqops.hr.service.ReimbursementService;
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
@RequestMapping("/api/v1/hr/reimbursements")
@RequiredArgsConstructor
public class ReimbursementController {

    private final ReimbursementService reimbursementService;

    @GetMapping
    @PreAuthorize("hasAuthority('hr.read')")
    public ResponseEntity<ApiResponse<List<ReimbursementResponse>>> list(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) String status,
            Pageable pageable) {
        Page<ReimbursementResponse> page = reimbursementService.list(employeeId, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('hr.write')")
    public ResponseEntity<ApiResponse<ReimbursementResponse>> submit(
            @Valid @RequestBody ReimbursementRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(reimbursementService.submit(request)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('hr.approve')")
    public ResponseEntity<ApiResponse<ReimbursementResponse>> approve(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(reimbursementService.approve(id)));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('hr.approve')")
    public ResponseEntity<ApiResponse<ReimbursementResponse>> reject(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(reimbursementService.reject(id)));
    }
}
