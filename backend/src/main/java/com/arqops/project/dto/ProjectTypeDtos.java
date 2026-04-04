package com.arqops.project.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public final class ProjectTypeDtos {

    private ProjectTypeDtos() {}

    public record TypeResponse(UUID id, String name, int displayOrder) {}

    public record TypeItem(@NotBlank @Size(max = 100) String name) {}

    public record ReplaceRequest(@Valid List<TypeItem> types) {
        public ReplaceRequest {
            types = types != null ? types : List.of();
        }
    }
}
