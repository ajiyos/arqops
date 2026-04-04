package com.arqops.project.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.project.dto.ProjectTypeDtos;
import com.arqops.project.service.TenantProjectTypeService;
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
@RequestMapping("/api/v1/project/project-types")
@RequiredArgsConstructor
public class TenantProjectTypeController {

    private final TenantProjectTypeService tenantProjectTypeService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('crm.read', 'project.read')")
    public ResponseEntity<ApiResponse<List<ProjectTypeDtos.TypeResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(tenantProjectTypeService.list()));
    }

    @PutMapping
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> replace(@Valid @RequestBody ProjectTypeDtos.ReplaceRequest request) {
        tenantProjectTypeService.replaceAll(request.types());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
