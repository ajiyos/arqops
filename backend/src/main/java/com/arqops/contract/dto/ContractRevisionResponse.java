package com.arqops.contract.dto;

import com.arqops.contract.model.ContractRevisionSource;

import java.time.Instant;
import java.util.UUID;

public record ContractRevisionResponse(
        UUID id,
        int revisionNumber,
        String body,
        ContractRevisionSource source,
        String userPrompt,
        String model,
        String systemPromptSnapshot,
        UUID createdBy,
        Instant createdAt
) {}
