package com.arqops.iam.dto;

import com.arqops.iam.entity.Role;

import java.util.List;
import java.util.UUID;

public record RoleResponse(
        UUID id,
        String name,
        boolean systemRole,
        List<String> permissions
) {
    public static RoleResponse from(Role r) {
        return new RoleResponse(r.getId(), r.getName(), r.isSystemRole(), r.getPermissions());
    }
}
