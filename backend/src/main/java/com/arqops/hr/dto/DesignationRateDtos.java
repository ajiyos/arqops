package com.arqops.hr.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public final class DesignationRateDtos {

    private DesignationRateDtos() {}

    public record RateResponse(UUID id, String designation, BigDecimal hourlyRate, int displayOrder) {}

    public record RateItem(
            @NotBlank @Size(max = 100) String designation,
            @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal hourlyRate) {}

    public record ReplaceRequest(@Valid List<RateItem> rates) {
        public ReplaceRequest {
            rates = rates != null ? rates : List.of();
        }
    }
}
