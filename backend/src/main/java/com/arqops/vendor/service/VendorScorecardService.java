package com.arqops.vendor.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.vendor.entity.Vendor;
import com.arqops.vendor.entity.VendorScorecard;
import com.arqops.vendor.repository.VendorRepository;
import com.arqops.vendor.repository.VendorScorecardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VendorScorecardService {

    private final VendorScorecardRepository scorecardRepository;
    private final VendorRepository vendorRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<VendorScorecard> listByVendor(UUID vendorId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        return scorecardRepository.findByTenantIdAndVendorId(tenantId, vendorId);
    }

    @Transactional
    public VendorScorecard create(UUID vendorId, UUID projectId,
                                  Integer qualityRating, Integer timelinessRating,
                                  Integer costRating, String notes) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> AppException.notFound("Vendor", vendorId));

        VendorScorecard sc = VendorScorecard.builder()
                .vendor(vendor)
                .projectId(projectId)
                .qualityRating(qualityRating)
                .timelinessRating(timelinessRating)
                .costRating(costRating)
                .notes(notes)
                .build();
        sc.setTenantId(tenantId);
        sc = scorecardRepository.save(sc);
        auditService.log("VendorScorecard", sc.getId(), "CREATE",
                Map.of("vendorId", vendorId.toString()));
        return sc;
    }

    @Transactional
    public void delete(UUID id) {
        VendorScorecard sc = scorecardRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("VendorScorecard", id));
        sc.setDeletedAt(Instant.now());
        scorecardRepository.save(sc);
    }
}
