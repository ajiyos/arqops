package com.arqops.contract.dto;

public record TenantContractAiConfigUpdateRequest(
        String openaiApiKey,
        String defaultSystemPrompt,
        String defaultModel
) {}
