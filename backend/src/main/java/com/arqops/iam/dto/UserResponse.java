package com.arqops.iam.dto;

import com.arqops.iam.entity.Role;
import com.arqops.iam.entity.User;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String name,
        String email,
        String status,
        List<String> roles,
        UUID employeeId,
        Instant lastLoginAt,
        Instant createdAt
) {
    public static UserResponse from(User u) {
        return from(u, null);
    }

    public static UserResponse from(User u, UUID employeeId) {
        return new UserResponse(
                u.getId(), u.getName(), u.getEmail(), u.getStatus(),
                u.getRoles().stream().map(Role::getName).toList(),
                employeeId,
                u.getLastLoginAt(), u.getCreatedAt()
        );
    }
}
