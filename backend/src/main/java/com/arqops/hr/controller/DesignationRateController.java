package com.arqops.hr.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.hr.dto.DesignationRateDtos;
import com.arqops.hr.service.TenantDesignationHourlyRateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/hr/designation-rates")
@RequiredArgsConstructor
public class DesignationRateController {

    private final TenantDesignationHourlyRateService designationHourlyRateService;

    @GetMapping
    @PreAuthorize("hasAuthority('hr.read')")
    public ResponseEntity<ApiResponse<List<DesignationRateDtos.RateResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(designationHourlyRateService.list()));
    }

    @PutMapping
    @PreAuthorize("hasRole('TENANT_ADMIN') or hasRole('HR_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> replace(@Valid @RequestBody DesignationRateDtos.ReplaceRequest request) {
        designationHourlyRateService.replaceAll(request.rates());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
