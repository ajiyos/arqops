package com.arqops.contract.dto;

public record GenerateRevisionRequest(
        String userInstructions,
        String systemPromptOverride
) {}
