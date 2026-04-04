package com.arqops.finance.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.finance.dto.VendorBillRequest;
import com.arqops.finance.dto.VendorBillResponse;
import com.arqops.finance.service.VendorBillService;
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
@RequestMapping("/api/v1/finance/vendor-bills")
@RequiredArgsConstructor
public class VendorBillController {

    private final VendorBillService vendorBillService;

    @GetMapping
    @PreAuthorize("hasAuthority('finance.read')")
    public ResponseEntity<ApiResponse<List<VendorBillResponse>>> list(Pageable pageable) {
        Page<VendorBillResponse> page = vendorBillService.list(pageable);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('finance.read')")
    public ResponseEntity<ApiResponse<VendorBillResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(vendorBillService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('finance.write')")
    public ResponseEntity<ApiResponse<VendorBillResponse>> create(@Valid @RequestBody VendorBillRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(vendorBillService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('finance.write')")
    public ResponseEntity<ApiResponse<VendorBillResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody VendorBillRequest request) {
        return ResponseEntity.ok(ApiResponse.success(vendorBillService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('finance.delete')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        vendorBillService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
