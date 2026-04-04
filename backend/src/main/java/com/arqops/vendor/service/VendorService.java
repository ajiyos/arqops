package com.arqops.vendor.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.encryption.EncryptionService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.vendor.dto.VendorRequest;
import com.arqops.vendor.dto.VendorResponse;
import com.arqops.vendor.entity.Vendor;
import com.arqops.vendor.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VendorService {

    private final VendorRepository vendorRepository;
    private final AuditService auditService;
    private final EncryptionService encryptionService;

    @Transactional(readOnly = true)
    public Page<VendorResponse> list(Pageable pageable, String query) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Page<Vendor> page = (query == null || query.isBlank())
                ? vendorRepository.findByTenantId(tenantId, pageable)
                : vendorRepository.searchByTenantId(tenantId, query.trim(), pageable);
        return page.map(VendorResponse::from);
    }

    @Transactional(readOnly = true)
    public VendorResponse get(UUID id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Vendor", id));
        return VendorResponse.from(
                vendor,
                encryptionService.decrypt(vendor.getPan()),
                encryptionService.decrypt(vendor.getBankDetailsEncrypted()));
    }

    @Transactional
    public VendorResponse create(VendorRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();

        Vendor vendor = Vendor.builder()
                .name(request.name())
                .category(request.category())
                .specialty(request.specialty())
                .gstin(request.gstin())
                .pan(encryptionService.encrypt(request.pan()))
                .bankDetailsEncrypted(encryptionService.encrypt(request.bankDetailsEncrypted()))
                .address(request.address())
                .phone(request.phone())
                .email(request.email())
                .status(request.status() != null ? request.status() : "active")
                .build();
        vendor.setTenantId(tenantId);
        vendor = vendorRepository.save(vendor);

        auditService.log("Vendor", vendor.getId(), "CREATE", Map.of("name", request.name()));
        return VendorResponse.from(vendor);
    }

    @Transactional
    public VendorResponse update(UUID id, VendorRequest request) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Vendor", id));

        if (request.name() != null) vendor.setName(request.name());
        if (request.category() != null) vendor.setCategory(request.category());
        if (request.specialty() != null) vendor.setSpecialty(request.specialty());
        if (request.gstin() != null) vendor.setGstin(request.gstin());
        if (request.pan() != null) vendor.setPan(encryptionService.encrypt(request.pan()));
        if (request.bankDetailsEncrypted() != null) {
            vendor.setBankDetailsEncrypted(encryptionService.encrypt(request.bankDetailsEncrypted()));
        }
        if (request.address() != null) vendor.setAddress(request.address());
        if (request.phone() != null) vendor.setPhone(request.phone());
        if (request.email() != null) vendor.setEmail(request.email());
        if (request.status() != null) vendor.setStatus(request.status());

        vendor = vendorRepository.save(vendor);
        auditService.log("Vendor", vendor.getId(), "UPDATE", Map.of("id", id));
        return VendorResponse.from(vendor);
    }

    @Transactional
    public void delete(UUID id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Vendor", id));
        vendor.setDeletedAt(Instant.now());
        vendorRepository.save(vendor);
        auditService.log("Vendor", vendor.getId(), "DELETE", Map.of("name", vendor.getName()));
    }
}
