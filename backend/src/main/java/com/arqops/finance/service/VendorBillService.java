package com.arqops.finance.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.finance.dto.VendorBillRequest;
import com.arqops.finance.dto.VendorBillResponse;
import com.arqops.finance.entity.VendorBill;
import com.arqops.finance.repository.VendorBillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VendorBillService {

    private final VendorBillRepository vendorBillRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public Page<VendorBillResponse> list(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        return vendorBillRepository.findByTenantId(tenantId, pageable).map(VendorBillResponse::from);
    }

    @Transactional(readOnly = true)
    public VendorBillResponse getById(UUID id) {
        VendorBill bill = vendorBillRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("VendorBill", id));
        assertTenant(bill);
        return VendorBillResponse.from(bill);
    }

    @Transactional
    public VendorBillResponse create(VendorBillRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        VendorBill bill = VendorBill.builder()
                .vendorId(request.vendorId())
                .workOrderId(request.workOrderId())
                .billNumber(request.billNumber())
                .amount(request.amount())
                .gstAmount(request.gstAmount() != null ? request.gstAmount() : BigDecimal.ZERO)
                .tdsSection(request.tdsSection())
                .tdsRate(request.tdsRate())
                .tdsAmount(request.tdsAmount() != null ? request.tdsAmount() : BigDecimal.ZERO)
                .dueDate(request.dueDate())
                .status(request.status() != null ? request.status() : "pending")
                .build();
        bill.setTenantId(tenantId);
        bill = vendorBillRepository.save(bill);
        auditService.log("VendorBill", bill.getId(), "CREATE", Map.of("vendorId", request.vendorId().toString()));
        return VendorBillResponse.from(bill);
    }

    @Transactional
    public VendorBillResponse update(UUID id, VendorBillRequest request) {
        VendorBill bill = vendorBillRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("VendorBill", id));
        assertTenant(bill);
        bill.setVendorId(request.vendorId());
        bill.setWorkOrderId(request.workOrderId());
        bill.setBillNumber(request.billNumber());
        bill.setAmount(request.amount());
        bill.setGstAmount(request.gstAmount() != null ? request.gstAmount() : BigDecimal.ZERO);
        bill.setTdsSection(request.tdsSection());
        bill.setTdsRate(request.tdsRate());
        bill.setTdsAmount(request.tdsAmount() != null ? request.tdsAmount() : BigDecimal.ZERO);
        bill.setDueDate(request.dueDate());
        if (request.status() != null) bill.setStatus(request.status());
        bill = vendorBillRepository.save(bill);
        auditService.log("VendorBill", bill.getId(), "UPDATE", Map.of());
        return VendorBillResponse.from(bill);
    }

    @Transactional
    public void delete(UUID id) {
        VendorBill bill = vendorBillRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("VendorBill", id));
        assertTenant(bill);
        bill.setDeletedAt(Instant.now());
        vendorBillRepository.save(bill);
        auditService.log("VendorBill", bill.getId(), "DELETE", Map.of());
    }

    private void assertTenant(VendorBill bill) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId != null && !tenantId.equals(bill.getTenantId())) {
            throw AppException.forbidden("Access denied");
        }
    }
}
