package com.arqops.contract.dto;

public record TenantContractAiConfigResponse(
        String defaultSystemPrompt,
        String defaultModel,
        boolean apiKeyConfigured,
        String apiKeyLastFour
) {}
