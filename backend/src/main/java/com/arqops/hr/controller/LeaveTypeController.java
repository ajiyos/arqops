package com.arqops.hr.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.hr.dto.LeaveTypeRequest;
import com.arqops.hr.dto.LeaveTypeResponse;
import com.arqops.hr.service.LeaveTypeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr/leave-types")
@RequiredArgsConstructor
public class LeaveTypeController {

    private final LeaveTypeService leaveTypeService;

    @GetMapping
    @PreAuthorize("hasAuthority('hr.read')")
    public ResponseEntity<ApiResponse<List<LeaveTypeResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(leaveTypeService.list()));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('hr.write')")
    public ResponseEntity<ApiResponse<LeaveTypeResponse>> create(@Valid @RequestBody LeaveTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(leaveTypeService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('hr.write')")
    public ResponseEntity<ApiResponse<LeaveTypeResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody LeaveTypeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(leaveTypeService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('hr.delete')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        leaveTypeService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
