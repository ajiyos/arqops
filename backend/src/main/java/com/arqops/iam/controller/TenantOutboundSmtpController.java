package com.arqops.iam.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.iam.dto.TenantOutboundSmtpResponse;
import com.arqops.iam.dto.TenantOutboundSmtpUpdateRequest;
import com.arqops.iam.service.TenantOutboundSmtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenant/outbound-email")
@RequiredArgsConstructor
public class TenantOutboundSmtpController {

    private final TenantOutboundSmtpService outboundSmtpService;

    @PreAuthorize("hasRole('TENANT_ADMIN')")
    @GetMapping
    public ResponseEntity<ApiResponse<TenantOutboundSmtpResponse>> get() {
        return ResponseEntity.ok(ApiResponse.success(outboundSmtpService.getForTenantAdmin()));
    }

    @PreAuthorize("hasRole('TENANT_ADMIN')")
    @PutMapping
    public ResponseEntity<ApiResponse<TenantOutboundSmtpResponse>> update(
            @RequestBody TenantOutboundSmtpUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(outboundSmtpService.update(request)));
    }
}
