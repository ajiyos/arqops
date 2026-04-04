package com.arqops.iam.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.hr.repository.EmployeeRepository;
import com.arqops.iam.dto.*;
import com.arqops.iam.entity.Role;
import com.arqops.iam.entity.User;
import com.arqops.iam.repository.RoleRepository;
import com.arqops.iam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public Page<UserResponse> listUsers(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        return userRepository.findByTenantId(tenantId, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public UserResponse getById(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (!user.getTenantId().equals(tenantId)) {
            throw AppException.forbidden("Access denied");
        }
        return toResponse(user);
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();

        if (userRepository.existsByTenantIdAndEmail(tenantId, request.email())) {
            throw AppException.conflict("User with this email already exists in this tenant");
        }

        Set<Role> roles = resolveRoles(tenantId, request.roleNames());

        User user = User.builder()
                .name(request.name())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .status("active")
                .roles(roles)
                .build();
        user.setTenantId(tenantId);
        user = userRepository.save(user);

        auditService.log("User", user.getId(), "CREATE", Map.of("email", request.email()));
        return toResponse(user);
    }

    @Transactional
    public UserResponse updateUser(UUID userId, UpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));

        UUID tenantId = TenantContext.getCurrentTenantId();
        if (!user.getTenantId().equals(tenantId)) {
            throw AppException.forbidden("Access denied");
        }

        if (request.name() != null && !request.name().isBlank()) {
            user.setName(request.name());
        }
        if (request.status() != null && !request.status().isBlank()) {
            user.setStatus(request.status());
        }
        if (request.roleNames() != null) {
            user.setRoles(resolveRoles(tenantId, request.roleNames()));
        }

        user = userRepository.save(user);
        auditService.log("User", user.getId(), "UPDATE", Map.of("fields", "name,status,roles"));
        return toResponse(user);
    }

    @Transactional
    public void deactivateUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (!user.getTenantId().equals(tenantId)) {
            throw AppException.forbidden("Access denied");
        }
        user.setStatus("inactive");
        user.setDeletedAt(Instant.now());
        userRepository.save(user);
        auditService.log("User", user.getId(), "DEACTIVATE", Map.of());
    }

    @Transactional
    public UserResponse updateMyProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
        user.setName(request.name());
        user = userRepository.save(user);
        auditService.log("User", user.getId(), "UPDATE_PROFILE", Map.of("name", request.name()));
        return toResponse(user);
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw AppException.badRequest("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        auditService.log("User", user.getId(), "CHANGE_PASSWORD", Map.of());
    }

    private UserResponse toResponse(User user) {
        UUID employeeId = employeeRepository.findByUserId(user.getId())
                .map(e -> e.getId())
                .orElse(null);
        return UserResponse.from(user, employeeId);
    }

    private Set<Role> resolveRoles(UUID tenantId, List<String> roleNames) {
        Set<Role> roles = new HashSet<>();
        if (roleNames != null) {
            for (String roleName : roleNames) {
                Role role = roleRepository.findByTenantIdAndName(tenantId, roleName)
                        .orElseThrow(() -> AppException.notFound("Role", roleName));
                roles.add(role);
            }
        }
        return roles;
    }
}
