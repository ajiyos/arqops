package com.arqops.finance.dto;

import jakarta.validation.Valid;

import java.util.List;
import java.util.UUID;

public final class SacCodeDtos {

    private SacCodeDtos() {}

    public record SacCodeResponse(UUID id, String code, String description, int displayOrder) {}

    public record SacCodeItem(String code, String description) {
        public SacCodeItem {
            description = description != null ? description : "";
        }
    }

    public record ReplaceRequest(@Valid List<SacCodeItem> codes) {
        public ReplaceRequest {
            codes = codes != null ? codes : List.of();
        }
    }
}
