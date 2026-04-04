package com.arqops.contract.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record SendContractRequest(
        @NotNull UUID revisionId,
        String subject,
        String message,
        List<String> recipientEmails
) {}
