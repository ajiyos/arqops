package com.arqops.contract.dto;

import java.time.Instant;
import java.util.UUID;

public record ContractSignedDocumentResponse(
        UUID id,
        UUID revisionId,
        String fileName,
        String storageKey,
        UUID uploadedBy,
        Instant uploadedAt
) {}
