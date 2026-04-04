package com.arqops.hr.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.hr.dto.EmployeeRequest;
import com.arqops.hr.dto.EmployeeResponse;
import com.arqops.hr.service.EmployeeService;
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
@RequestMapping("/api/v1/hr/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;

    @GetMapping
    @PreAuthorize("hasAuthority('hr.read')")
    public ResponseEntity<ApiResponse<List<EmployeeResponse>>> list(Pageable pageable) {
        Page<EmployeeResponse> page = employeeService.list(pageable);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('hr.write')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> create(@Valid @RequestBody EmployeeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(employeeService.create(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('hr.read')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.get(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('hr.write')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody EmployeeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('hr.delete')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        employeeService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
