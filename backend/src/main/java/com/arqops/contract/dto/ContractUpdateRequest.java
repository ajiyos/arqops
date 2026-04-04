package com.arqops.contract.dto;

import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ContractUpdateRequest(
        @Size(max = 500) String title,
        UUID projectId,
        @Size(max = 30) String status
) {}
