package com.arqops.contract.dto;

import jakarta.validation.constraints.NotNull;

public record ManualRevisionRequest(
        @NotNull String body
) {}
