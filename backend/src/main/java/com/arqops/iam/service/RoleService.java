package com.arqops.iam.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.iam.dto.RoleRequest;
import com.arqops.iam.dto.RoleResponse;
import com.arqops.iam.entity.Role;
import com.arqops.iam.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final AuditService auditService;

    public List<RoleResponse> listRoles() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        return roleRepository.findByTenantId(tenantId).stream()
                .map(RoleResponse::from)
                .toList();
    }

    @Transactional
    public RoleResponse createRole(RoleRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();

        Role role = Role.builder()
                .name(request.name())
                .systemRole(false)
                .permissions(request.permissions())
                .build();
        role.setTenantId(tenantId);
        role = roleRepository.save(role);

        auditService.log("Role", role.getId(), "CREATE", Map.of("name", request.name()));
        return RoleResponse.from(role);
    }

    @Transactional
    public RoleResponse updateRole(UUID roleId, RoleRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> AppException.notFound("Role", roleId));

        if (role.isSystemRole()) {
            throw AppException.badRequest("Cannot modify system roles");
        }

        UUID tenantId = TenantContext.getCurrentTenantId();
        if (!role.getTenantId().equals(tenantId)) {
            throw AppException.forbidden("Access denied");
        }

        if (request.name() != null) role.setName(request.name());
        if (request.permissions() != null) role.setPermissions(request.permissions());

        role = roleRepository.save(role);
        auditService.log("Role", role.getId(), "UPDATE", Map.of("name", role.getName()));
        return RoleResponse.from(role);
    }

    @Transactional
    public void deleteRole(UUID roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> AppException.notFound("Role", roleId));

        if (role.isSystemRole()) {
            throw AppException.badRequest("Cannot delete system roles");
        }

        UUID tenantId = TenantContext.getCurrentTenantId();
        if (!role.getTenantId().equals(tenantId)) {
            throw AppException.forbidden("Access denied");
        }

        role.setDeletedAt(java.time.Instant.now());
        roleRepository.save(role);
        auditService.log("Role", role.getId(), "DELETE", Map.of("name", role.getName()));
    }
}
