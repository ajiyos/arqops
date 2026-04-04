package com.arqops.iam.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.iam.dto.CreateTenantRequest;
import com.arqops.iam.dto.TenantResponse;
import com.arqops.iam.dto.UpdateTenantStatusRequest;
import com.arqops.iam.service.PlatformTenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/platform/tenants")
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
@RequiredArgsConstructor
public class PlatformTenantController {

    private final PlatformTenantService platformTenantService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<TenantResponse>>> list(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(platformTenantService.listTenants(pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TenantResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(platformTenantService.getTenant(id)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<TenantResponse>> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTenantStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                platformTenantService.updateTenantStatus(id, request.status())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TenantResponse>> create(
            @Valid @RequestBody CreateTenantRequest request) {
        return ResponseEntity.ok(ApiResponse.success(platformTenantService.createTenant(request)));
    }
}
