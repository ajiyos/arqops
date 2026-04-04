package com.arqops.contract.dto;

import java.time.Instant;
import java.util.UUID;

public record ContractSummaryResponse(
        UUID id,
        String title,
        String status,
        UUID projectId,
        Integer latestRevisionNumber,
        Instant createdAt,
        Instant updatedAt
) {}
