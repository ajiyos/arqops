package com.arqops.contract.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record ContractCreateRequest(
        @NotBlank @Size(max = 500) String title,
        UUID projectId,
        @Size(max = 30) String status,
        List<ContractPartyRequest> parties
) {}
