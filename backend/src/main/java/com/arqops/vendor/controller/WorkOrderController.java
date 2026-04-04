package com.arqops.vendor.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.vendor.dto.WorkOrderRequest;
import com.arqops.vendor.dto.WorkOrderResponse;
import com.arqops.vendor.service.WorkOrderService;
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
@RequestMapping("/api/v1/vendor/work-orders")
@RequiredArgsConstructor
public class WorkOrderController {

    private final WorkOrderService workOrderService;

    @PreAuthorize("hasAuthority('vendor.read')")
    @GetMapping
    public ResponseEntity<ApiResponse<List<WorkOrderResponse>>> list(
            Pageable pageable,
            @RequestParam(required = false) UUID vendorId) {
        Page<WorkOrderResponse> page = workOrderService.list(pageable, vendorId);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @PreAuthorize("hasAuthority('vendor.read')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WorkOrderResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(workOrderService.get(id)));
    }

    @PreAuthorize("hasAuthority('vendor.write')")
    @PostMapping
    public ResponseEntity<ApiResponse<WorkOrderResponse>> create(
            @Valid @RequestBody WorkOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(workOrderService.create(request)));
    }

    @PreAuthorize("hasAuthority('vendor.write')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<WorkOrderResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody WorkOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success(workOrderService.update(id, request)));
    }

    @PreAuthorize("hasAuthority('vendor.delete')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        workOrderService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PreAuthorize("hasAuthority('vendor.approve')")
    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<WorkOrderResponse>> approve(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(workOrderService.approve(id)));
    }
}
