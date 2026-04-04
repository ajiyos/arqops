package com.arqops.vendor.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.security.UserPrincipal;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.vendor.dto.WorkOrderRequest;
import com.arqops.vendor.dto.WorkOrderResponse;
import com.arqops.vendor.entity.Vendor;
import com.arqops.vendor.entity.WorkOrder;
import com.arqops.vendor.repository.VendorRepository;
import com.arqops.vendor.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkOrderService {

    private final WorkOrderRepository workOrderRepository;
    private final VendorRepository vendorRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public Page<WorkOrderResponse> list(Pageable pageable, UUID vendorId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Page<WorkOrder> page = vendorId == null
                ? workOrderRepository.findByTenantId(tenantId, pageable)
                : workOrderRepository.findByTenantIdAndVendorId(tenantId, vendorId, pageable);
        return page.map(WorkOrderResponse::from);
    }

    @Transactional
    public WorkOrderResponse create(WorkOrderRequest request) {
        if (request.vendorId() == null) {
            throw AppException.badRequest("vendorId is required");
        }
        UUID tenantId = TenantContext.getCurrentTenantId();
        Vendor vendor = vendorRepository.findById(request.vendorId())
                .orElseThrow(() -> AppException.notFound("Vendor", request.vendorId()));

        WorkOrder wo = WorkOrder.builder()
                .vendor(vendor)
                .projectId(request.projectId())
                .woNumber(request.woNumber())
                .scope(request.scope())
                .value(request.value())
                .paymentTerms(request.paymentTerms())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .status(request.status() != null ? request.status() : "draft")
                .build();
        wo.setTenantId(tenantId);
        wo = workOrderRepository.save(wo);

        auditService.log("WorkOrder", wo.getId(), "CREATE", Map.of("vendorId", request.vendorId()));
        return WorkOrderResponse.from(wo);
    }

    @Transactional
    public WorkOrderResponse update(UUID id, WorkOrderRequest request) {
        WorkOrder wo = workOrderRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("WorkOrder", id));

        if (request.vendorId() != null) {
            Vendor vendor = vendorRepository.findById(request.vendorId())
                    .orElseThrow(() -> AppException.notFound("Vendor", request.vendorId()));
            wo.setVendor(vendor);
        }
        if (request.projectId() != null) wo.setProjectId(request.projectId());
        if (request.woNumber() != null) wo.setWoNumber(request.woNumber());
        if (request.scope() != null) wo.setScope(request.scope());
        if (request.value() != null) wo.setValue(request.value());
        if (request.paymentTerms() != null) wo.setPaymentTerms(request.paymentTerms());
        if (request.startDate() != null) wo.setStartDate(request.startDate());
        if (request.endDate() != null) wo.setEndDate(request.endDate());
        if (request.status() != null) wo.setStatus(request.status());

        wo = workOrderRepository.save(wo);
        auditService.log("WorkOrder", wo.getId(), "UPDATE", Map.of("id", id));
        return WorkOrderResponse.from(wo);
    }

    @Transactional
    public WorkOrderResponse approve(UUID id) {
        WorkOrder wo = workOrderRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("WorkOrder", id));

        UUID userId = requireCurrentUserId();
        wo.setStatus("approved");
        wo.setApprovedBy(userId);
        wo.setApprovedAt(Instant.now());
        wo = workOrderRepository.save(wo);

        auditService.log("WorkOrder", wo.getId(), "APPROVE", Map.of("approvedBy", userId));
        return WorkOrderResponse.from(wo);
    }

    @Transactional(readOnly = true)
    public WorkOrderResponse get(UUID id) {
        WorkOrder wo = workOrderRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("WorkOrder", id));
        return WorkOrderResponse.from(wo);
    }

    @Transactional
    public void delete(UUID id) {
        WorkOrder wo = workOrderRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("WorkOrder", id));
        wo.setDeletedAt(Instant.now());
        workOrderRepository.save(wo);
        auditService.log("WorkOrder", wo.getId(), "DELETE", Map.of("woNumber", wo.getWoNumber()));
    }

    private UUID requireCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal p) {
            return p.userId();
        }
        throw AppException.unauthorized("Authentication required");
    }
}
