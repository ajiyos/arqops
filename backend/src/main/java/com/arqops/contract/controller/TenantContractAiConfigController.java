package com.arqops.contract.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.contract.dto.TenantContractAiConfigResponse;
import com.arqops.contract.dto.TenantContractAiConfigUpdateRequest;
import com.arqops.contract.service.TenantContractAiConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenant/contract-ai")
@RequiredArgsConstructor
public class TenantContractAiConfigController {

    private final TenantContractAiConfigService configService;

    @PreAuthorize("hasRole('TENANT_ADMIN')")
    @GetMapping
    public ResponseEntity<ApiResponse<TenantContractAiConfigResponse>> get() {
        return ResponseEntity.ok(ApiResponse.success(configService.getForTenantAdmin()));
    }

    @PreAuthorize("hasRole('TENANT_ADMIN')")
    @PutMapping
    public ResponseEntity<ApiResponse<TenantContractAiConfigResponse>> update(
            @Valid @RequestBody TenantContractAiConfigUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(configService.update(request)));
    }
}
