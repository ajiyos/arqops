package com.arqops.finance.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.finance.dto.InvoiceRequest;
import com.arqops.finance.dto.InvoiceResponse;
import com.arqops.finance.dto.PaymentRequest;
import com.arqops.finance.dto.PaymentResponse;
import com.arqops.finance.service.InvoiceService;
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
@RequestMapping("/api/v1/finance/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    @PreAuthorize("hasAuthority('finance.read')")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> list(Pageable pageable) {
        Page<InvoiceResponse> page = invoiceService.list(pageable);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('finance.read')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('finance.write')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> create(@Valid @RequestBody InvoiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(invoiceService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('finance.write')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody InvoiceRequest request) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('finance.delete')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        invoiceService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/{id}/payments")
    @PreAuthorize("hasAuthority('finance.read')")
    public ResponseEntity<ApiResponse<java.util.List<PaymentResponse>>> listPayments(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.listPayments(id)));
    }

    @PostMapping("/{id}/payments")
    @PreAuthorize("hasAuthority('finance.write')")
    public ResponseEntity<ApiResponse<PaymentResponse>> recordPayment(
            @PathVariable UUID id, @Valid @RequestBody PaymentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(invoiceService.recordPayment(id, request)));
    }
}
