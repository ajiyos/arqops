package com.arqops.contract.dto;

import com.arqops.contract.model.ContractPartyKind;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ContractPartyRequest(
        @NotNull ContractPartyKind partyKind,
        UUID clientId,
        UUID vendorId,
        String displayName,
        String contactEmail
) {}
