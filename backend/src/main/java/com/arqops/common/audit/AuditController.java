package com.arqops.common.audit;

import com.arqops.common.dto.ApiResponse;
import com.arqops.common.tenancy.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditLog>>> list(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Page<AuditLog> page = auditLogRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditLog>>> byEntity(
            @PathVariable String entityType,
            @PathVariable UUID entityId,
            Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Page<AuditLog> page = auditLogRepository.findByTenantIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                tenantId, entityType, entityId, pageable);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }
}
