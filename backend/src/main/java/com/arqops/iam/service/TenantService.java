package com.arqops.iam.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.iam.dto.CreateTenantRequest;
import com.arqops.iam.dto.TenantResponse;
import com.arqops.iam.dto.UpdateTenantProfileRequest;
import com.arqops.iam.entity.Role;
import com.arqops.iam.entity.Tenant;
import com.arqops.iam.entity.User;
import com.arqops.iam.repository.RoleRepository;
import com.arqops.iam.repository.TenantRepository;
import com.arqops.iam.repository.UserRepository;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.finance.service.TenantExpenseCategoryService;
import com.arqops.hr.service.TenantDesignationHourlyRateService;
import com.arqops.project.service.TenantProjectTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final TenantExpenseCategoryService tenantExpenseCategoryService;
    private final TenantDesignationHourlyRateService tenantDesignationHourlyRateService;
    private final TenantProjectTypeService tenantProjectTypeService;

    @Transactional
    public TenantResponse createTenant(CreateTenantRequest request) {
        if (tenantRepository.existsBySubdomainSlug(request.subdomainSlug())) {
            throw AppException.conflict("Subdomain slug already exists");
        }

        Tenant tenant = Tenant.builder()
                .name(request.name())
                .subdomainSlug(request.subdomainSlug())
                .plan(request.plan() != null ? request.plan() : "starter")
                .status("active")
                .build();
        tenant = tenantRepository.save(tenant);

        tenantExpenseCategoryService.seedDefaultsForNewTenant(tenant.getId());
        tenantDesignationHourlyRateService.seedDefaultsForNewTenant(tenant.getId());
        tenantProjectTypeService.seedDefaultsForNewTenant(tenant.getId());

        createDefaultRoles(tenant.getId());

        Role adminRole = roleRepository.findByTenantIdAndName(tenant.getId(), "TENANT_ADMIN")
                .orElseThrow();

        User adminUser = User.builder()
                .name(request.adminName())
                .email(request.adminEmail())
                .passwordHash(passwordEncoder.encode(request.adminPassword()))
                .status("active")
                .roles(Set.of(adminRole))
                .build();
        adminUser.setTenantId(tenant.getId());
        userRepository.save(adminUser);

        return TenantResponse.from(tenant);
    }

    public TenantResponse getCurrentTenantProfile() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> AppException.notFound("Tenant", tenantId));
        return TenantResponse.from(tenant);
    }

    @Transactional
    public TenantResponse updateTenantProfile(UpdateTenantProfileRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> AppException.notFound("Tenant", tenantId));

        if (request.name() != null) tenant.setName(request.name());
        if (request.gstin() != null) tenant.setGstin(request.gstin());
        if (request.pan() != null) tenant.setPan(request.pan());
        if (request.address() != null) tenant.setAddress(request.address());
        if (request.logoUrl() != null) tenant.setLogoUrl(request.logoUrl());
        if (request.settings() != null) {
            java.util.Map<String, Object> merged = tenant.getSettings() != null
                    ? new java.util.LinkedHashMap<>(tenant.getSettings())
                    : new java.util.LinkedHashMap<>();
            merged.putAll(request.settings());
            tenant.setSettings(merged);
        }

        tenant = tenantRepository.save(tenant);
        auditService.log("Tenant", tenant.getId(), "UPDATE", Map.of("fields", "profile_updated"));
        return TenantResponse.from(tenant);
    }

    private void createDefaultRoles(UUID tenantId) {
        List<Role> roles = List.of(
                buildRole(tenantId, "TENANT_ADMIN", true, List.of(
                        "crm.read", "crm.write", "crm.delete",
                        "vendor.read", "vendor.write", "vendor.delete", "vendor.approve",
                        "project.read", "project.write", "project.delete",
                        "finance.read", "finance.write", "finance.delete",
                        "hr.read", "hr.write", "hr.delete", "hr.approve",
                        "report.read",
                        "contract.read", "contract.write")),
                buildRole(tenantId, "LEGAL", true, List.of(
                        "contract.read", "contract.write",
                        "crm.read", "project.read", "vendor.read")),
                buildRole(tenantId, "PROJECT_LEAD", true, List.of(
                        "crm.read", "crm.write",
                        "vendor.read", "vendor.write", "vendor.approve",
                        "project.read", "project.write", "project.delete",
                        "finance.read",
                        "hr.read", "hr.write",
                        "report.read")),
                buildRole(tenantId, "FINANCE_MANAGER", true, List.of(
                        "crm.read",
                        "vendor.read", "vendor.write", "vendor.approve",
                        "project.read",
                        "finance.read", "finance.write", "finance.delete",
                        "hr.read",
                        "report.read")),
                buildRole(tenantId, "HR_ADMIN", true, List.of(
                        "crm.read",
                        "project.read",
                        "hr.read", "hr.write", "hr.delete", "hr.approve",
                        "report.read")),
                buildRole(tenantId, "STAFF", true, List.of(
                        "crm.read", "crm.write",
                        "vendor.read",
                        "project.read", "project.write",
                        "finance.read",
                        "hr.read", "hr.write",
                        "report.read")),
                buildRole(tenantId, "VIEWER", true, List.of(
                        "crm.read", "vendor.read", "project.read",
                        "finance.read", "hr.read", "report.read"))
        );
        roleRepository.saveAll(roles);
    }

    private Role buildRole(UUID tenantId, String name, boolean system, List<String> permissions) {
        Role role = Role.builder()
                .name(name)
                .systemRole(system)
                .permissions(permissions)
                .build();
        role.setTenantId(tenantId);
        return role;
    }
}
