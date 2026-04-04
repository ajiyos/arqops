package com.arqops.iam.service;

import com.arqops.common.exception.AppException;
import com.arqops.iam.dto.CreateTenantRequest;
import com.arqops.iam.dto.TenantResponse;
import com.arqops.iam.entity.Tenant;
import com.arqops.iam.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlatformTenantService {

    private final TenantRepository tenantRepository;
    private final TenantService tenantService;

    public Page<TenantResponse> listTenants(Pageable pageable) {
        return tenantRepository.findAll(pageable).map(TenantResponse::from);
    }

    public TenantResponse getTenant(UUID id) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Tenant", id));
        return TenantResponse.from(tenant);
    }

    @Transactional
    public TenantResponse updateTenantStatus(UUID id, String status) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Tenant", id));
        tenant.setStatus(status);
        tenant = tenantRepository.save(tenant);
        return TenantResponse.from(tenant);
    }

    @Transactional
    public TenantResponse createTenant(CreateTenantRequest request) {
        return tenantService.createTenant(request);
    }
}
