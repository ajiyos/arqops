package com.arqops.contract.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ContractDetailResponse(
        UUID id,
        String title,
        String status,
        UUID projectId,
        UUID createdBy,
        Instant createdAt,
        Instant updatedAt,
        List<ContractPartyResponse> parties,
        List<ContractRevisionResponse> revisions,
        List<ContractSignedDocumentResponse> signedDocuments,
        List<ContractSendLogResponse> sendLog
) {}
