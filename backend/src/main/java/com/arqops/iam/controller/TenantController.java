package com.arqops.iam.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.common.security.UserPrincipal;
import com.arqops.iam.dto.*;
import com.arqops.iam.service.TenantBrandingService;
import com.arqops.iam.service.TenantService;
import com.arqops.iam.service.UserService;
import com.arqops.iam.service.RoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tenant")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;
    private final TenantBrandingService tenantBrandingService;
    private final UserService userService;
    private final RoleService roleService;

    // ── Tenant ──────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ApiResponse<TenantResponse>> createTenant(
            @Valid @RequestBody CreateTenantRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(tenantService.createTenant(request)));
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<TenantResponse>> getProfile() {
        return ResponseEntity.ok(ApiResponse.success(tenantService.getCurrentTenantProfile()));
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<TenantResponse>> updateProfile(
            @Valid @RequestBody UpdateTenantProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success(tenantService.updateTenantProfile(request)));
    }

    @PostMapping(value = "/profile/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadLogo(@RequestPart("file") MultipartFile file) {
        String logoUrl = tenantBrandingService.saveLogo(file);
        return ResponseEntity.ok(ApiResponse.success(Map.of("logoUrl", logoUrl)));
    }

    @DeleteMapping("/profile/logo")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<TenantResponse>> deleteLogo() {
        tenantBrandingService.clearLogo();
        return ResponseEntity.ok(ApiResponse.success(tenantService.getCurrentTenantProfile()));
    }

    // ── Users (admin) ───────────────────────────────────

    @GetMapping("/users")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> listUsers(Pageable pageable) {
        Page<UserResponse> page = userService.listUsers(pageable);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @GetMapping("/users/{id}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> getUser(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(userService.getById(id)));
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(userService.createUser(request)));
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userService.updateUser(id, request)));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable UUID id) {
        userService.deactivateUser(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ── Self-service (my account) ───────────────────────

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getMyProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(userService.getById(principal.userId())));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateMyProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.updateMyProfile(principal.userId(), request)));
    }

    @PostMapping("/me/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(principal.userId(), request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ── Roles ───────────────────────────────────────────

    @GetMapping("/roles")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> listRoles() {
        return ResponseEntity.ok(ApiResponse.success(roleService.listRoles()));
    }

    @PostMapping("/roles")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> createRole(
            @Valid @RequestBody RoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(roleService.createRole(request)));
    }

    @PutMapping("/roles/{id}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> updateRole(
            @PathVariable UUID id, @Valid @RequestBody RoleRequest request) {
        return ResponseEntity.ok(ApiResponse.success(roleService.updateRole(id, request)));
    }

    @DeleteMapping("/roles/{id}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable UUID id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
