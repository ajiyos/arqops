package com.arqops.finance.dto;

import jakarta.validation.Valid;

import java.util.List;
import java.util.UUID;

public final class ExpenseCategoryDtos {

    private ExpenseCategoryDtos() {}

    public record CategoryResponse(UUID id, String name, int displayOrder) {}

    public record CategoryItem(String name) {}

    public record ReplaceRequest(@Valid List<CategoryItem> categories) {
        public ReplaceRequest {
            categories = categories != null ? categories : List.of();
        }
    }
}
