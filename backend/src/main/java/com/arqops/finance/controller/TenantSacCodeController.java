package com.arqops.finance.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.finance.dto.SacCodeDtos;
import com.arqops.finance.service.TenantSacCodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/finance/sac-codes")
@RequiredArgsConstructor
public class TenantSacCodeController {

    private final TenantSacCodeService sacCodeService;

    @GetMapping
    @PreAuthorize("hasAuthority('finance.read')")
    public ResponseEntity<ApiResponse<List<SacCodeDtos.SacCodeResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(sacCodeService.list()));
    }

    @PutMapping
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> replace(@Valid @RequestBody SacCodeDtos.ReplaceRequest request) {
        sacCodeService.replaceAll(request.codes());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
