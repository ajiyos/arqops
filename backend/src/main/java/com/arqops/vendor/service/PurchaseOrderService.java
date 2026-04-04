package com.arqops.vendor.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.security.UserPrincipal;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.vendor.dto.PurchaseOrderRequest;
import com.arqops.vendor.dto.PurchaseOrderResponse;
import com.arqops.vendor.entity.PurchaseOrder;
import com.arqops.vendor.entity.WorkOrder;
import com.arqops.vendor.repository.PurchaseOrderRepository;
import com.arqops.vendor.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final WorkOrderRepository workOrderRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public Page<PurchaseOrderResponse> list(Pageable pageable, UUID workOrderId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Page<PurchaseOrder> page = workOrderId == null
                ? purchaseOrderRepository.findByTenantId(tenantId, pageable)
                : purchaseOrderRepository.findByTenantIdAndWorkOrderId(tenantId, workOrderId, pageable);
        return page.map(PurchaseOrderResponse::from);
    }

    @Transactional
    public PurchaseOrderResponse create(PurchaseOrderRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();

        WorkOrder workOrder = null;
        if (request.workOrderId() != null) {
            workOrder = workOrderRepository.findById(request.workOrderId())
                    .orElseThrow(() -> AppException.notFound("WorkOrder", request.workOrderId()));
        }

        BigDecimal gst = request.gstAmount() != null ? request.gstAmount() : BigDecimal.ZERO;
        BigDecimal total = request.total() != null ? request.total() : BigDecimal.ZERO;

        PurchaseOrder po = PurchaseOrder.builder()
                .workOrder(workOrder)
                .poNumber(request.poNumber())
                .lineItems(request.lineItems())
                .gstAmount(gst)
                .total(total)
                .status(request.status() != null ? request.status() : "draft")
                .build();
        po.setTenantId(tenantId);
        po = purchaseOrderRepository.save(po);

        auditService.log("PurchaseOrder", po.getId(), "CREATE", Map.of("poNumber", request.poNumber()));
        return PurchaseOrderResponse.from(po);
    }

    @Transactional
    public PurchaseOrderResponse update(UUID id, PurchaseOrderRequest request) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("PurchaseOrder", id));

        if (request.workOrderId() != null) {
            WorkOrder wo = workOrderRepository.findById(request.workOrderId())
                    .orElseThrow(() -> AppException.notFound("WorkOrder", request.workOrderId()));
            po.setWorkOrder(wo);
        }
        if (request.poNumber() != null) po.setPoNumber(request.poNumber());
        if (request.lineItems() != null) po.setLineItems(request.lineItems());
        if (request.gstAmount() != null) po.setGstAmount(request.gstAmount());
        if (request.total() != null) po.setTotal(request.total());
        if (request.status() != null) po.setStatus(request.status());

        po = purchaseOrderRepository.save(po);
        auditService.log("PurchaseOrder", po.getId(), "UPDATE", Map.of("id", id));
        return PurchaseOrderResponse.from(po);
    }

    @Transactional
    public PurchaseOrderResponse approve(UUID id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("PurchaseOrder", id));

        UUID userId = requireCurrentUserId();
        po.setStatus("approved");
        po.setApprovedBy(userId);
        po.setApprovedAt(Instant.now());
        po = purchaseOrderRepository.save(po);

        auditService.log("PurchaseOrder", po.getId(), "APPROVE", Map.of("approvedBy", userId));
        return PurchaseOrderResponse.from(po);
    }

    @Transactional(readOnly = true)
    public PurchaseOrderResponse get(UUID id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("PurchaseOrder", id));
        return PurchaseOrderResponse.from(po);
    }

    @Transactional
    public void delete(UUID id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("PurchaseOrder", id));
        po.setDeletedAt(Instant.now());
        purchaseOrderRepository.save(po);
        auditService.log("PurchaseOrder", po.getId(), "DELETE", Map.of("poNumber", po.getPoNumber()));
    }

    private UUID requireCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal p) {
            return p.userId();
        }
        throw AppException.unauthorized("Authentication required");
    }
}
