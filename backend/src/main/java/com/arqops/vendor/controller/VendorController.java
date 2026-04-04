package com.arqops.vendor.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.vendor.dto.VendorRequest;
import com.arqops.vendor.dto.VendorResponse;
import com.arqops.vendor.service.VendorService;
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
@RequestMapping("/api/v1/vendor/vendors")
@RequiredArgsConstructor
public class VendorController {

    private final VendorService vendorService;

    @PreAuthorize("hasAuthority('vendor.read')")
    @GetMapping
    public ResponseEntity<ApiResponse<List<VendorResponse>>> list(
            Pageable pageable,
            @RequestParam(required = false) String q) {
        Page<VendorResponse> page = vendorService.list(pageable, q);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @PreAuthorize("hasAuthority('vendor.read')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<VendorResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(vendorService.get(id)));
    }

    @PreAuthorize("hasAuthority('vendor.write')")
    @PostMapping
    public ResponseEntity<ApiResponse<VendorResponse>> create(
            @Valid @RequestBody VendorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(vendorService.create(request)));
    }

    @PreAuthorize("hasAuthority('vendor.write')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<VendorResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody VendorRequest request) {
        return ResponseEntity.ok(ApiResponse.success(vendorService.update(id, request)));
    }

    @PreAuthorize("hasAuthority('vendor.delete')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        vendorService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
