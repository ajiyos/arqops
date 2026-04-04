package com.arqops.finance.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.common.storage.FileDownload;
import com.arqops.finance.dto.ExpenseRequest;
import com.arqops.finance.dto.ExpenseResponse;
import com.arqops.finance.service.ExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping
    @PreAuthorize("hasAuthority('finance.read')")
    public ResponseEntity<ApiResponse<List<ExpenseResponse>>> list(Pageable pageable) {
        Page<ExpenseResponse> page = expenseService.list(pageable);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('finance.read')")
    public ResponseEntity<ApiResponse<ExpenseResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(expenseService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('finance.write')")
    public ResponseEntity<ApiResponse<ExpenseResponse>> create(@Valid @RequestBody ExpenseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(expenseService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('finance.write')")
    public ResponseEntity<ApiResponse<ExpenseResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody ExpenseRequest request) {
        return ResponseEntity.ok(ApiResponse.success(expenseService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('finance.delete')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        expenseService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/{id}/receipt/download")
    @PreAuthorize("hasAuthority('finance.read')")
    public ResponseEntity<StreamingResponseBody> downloadReceipt(@PathVariable UUID id) {
        FileDownload fd = expenseService.openReceiptDownload(id);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(fd.fileName(), StandardCharsets.UTF_8)
                .build();
        StreamingResponseBody body = outputStream -> {
            try (fd) {
                fd.inputStream().transferTo(outputStream);
            }
        };
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(fd.contentType()))
                .body(body);
    }
}
