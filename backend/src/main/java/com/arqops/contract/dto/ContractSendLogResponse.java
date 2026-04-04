package com.arqops.contract.dto;

import java.time.Instant;
import java.util.UUID;

public record ContractSendLogResponse(
        UUID id,
        UUID revisionId,
        String subject,
        String recipientEmails,
        String status,
        String errorMessage,
        UUID sentBy,
        Instant createdAt
) {}
