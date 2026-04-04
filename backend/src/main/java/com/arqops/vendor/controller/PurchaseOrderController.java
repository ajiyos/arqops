package com.arqops.vendor.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.vendor.dto.PurchaseOrderRequest;
import com.arqops.vendor.dto.PurchaseOrderResponse;
import com.arqops.vendor.service.PurchaseOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vendor/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @PreAuthorize("hasAuthority('vendor.read')")
    @GetMapping
    public ResponseEntity<ApiResponse<List<PurchaseOrderResponse>>> list(
            Pageable pageable,
            @RequestParam(required = false) UUID workOrderId) {
        Page<PurchaseOrderResponse> page = purchaseOrderService.list(pageable, workOrderId);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @PreAuthorize("hasAuthority('vendor.read')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(purchaseOrderService.get(id)));
    }

    @PreAuthorize("hasAuthority('vendor.write')")
    @PostMapping
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> create(
            @Valid @RequestBody PurchaseOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(purchaseOrderService.create(request)));
    }

    @PreAuthorize("hasAuthority('vendor.write')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody PurchaseOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success(purchaseOrderService.update(id, request)));
    }

    @PreAuthorize("hasAuthority('vendor.delete')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        purchaseOrderService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PreAuthorize("hasAuthority('vendor.approve')")
    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> approve(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(purchaseOrderService.approve(id)));
    }
}
