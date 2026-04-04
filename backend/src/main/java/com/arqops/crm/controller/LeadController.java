package com.arqops.crm.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.crm.dto.LeadRequest;
import com.arqops.crm.dto.LeadResponse;
import com.arqops.crm.dto.LeadStageResponse;
import com.arqops.crm.repository.LeadStageRepository;
import com.arqops.crm.service.LeadService;
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
@RequestMapping("/api/v1/crm/leads")
@RequiredArgsConstructor
public class LeadController {

    private final LeadService leadService;
    private final LeadStageRepository leadStageRepository;

    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping
    public ResponseEntity<ApiResponse<List<LeadResponse>>> list(
            Pageable pageable,
            @RequestParam(required = false) String stage) {
        Page<LeadResponse> page = leadService.list(pageable, stage);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LeadResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(leadService.getById(id)));
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PostMapping
    public ResponseEntity<ApiResponse<LeadResponse>> create(@Valid @RequestBody LeadRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(leadService.create(request)));
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LeadResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody LeadRequest request) {
        return ResponseEntity.ok(ApiResponse.success(leadService.update(id, request)));
    }

    @PreAuthorize("hasAuthority('crm.delete')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        leadService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PostMapping("/{id}/convert")
    public ResponseEntity<ApiResponse<LeadResponse>> convert(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(leadService.convertToProject(id)));
    }

    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping("/stages")
    public ResponseEntity<ApiResponse<List<LeadStageResponse>>> listStages() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        List<LeadStageResponse> stages = leadStageRepository
                .findByTenantIdOrderByDisplayOrderAsc(tenantId)
                .stream().map(LeadStageResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.success(stages));
    }
}
