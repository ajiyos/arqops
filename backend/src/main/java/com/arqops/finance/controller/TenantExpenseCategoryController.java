package com.arqops.finance.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.finance.dto.ExpenseCategoryDtos;
import com.arqops.finance.service.TenantExpenseCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/finance/expense-categories")
@RequiredArgsConstructor
public class TenantExpenseCategoryController {

    private final TenantExpenseCategoryService expenseCategoryService;

    @GetMapping
    @PreAuthorize("hasAuthority('finance.read')")
    public ResponseEntity<ApiResponse<List<ExpenseCategoryDtos.CategoryResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(expenseCategoryService.list()));
    }

    @PutMapping
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> replace(@Valid @RequestBody ExpenseCategoryDtos.ReplaceRequest request) {
        expenseCategoryService.replaceAll(request.categories());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
