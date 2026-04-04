package com.arqops.contract.dto;

import com.arqops.contract.model.ContractPartyKind;

import java.util.UUID;

public record ContractPartyResponse(
        UUID id,
        ContractPartyKind partyKind,
        UUID clientId,
        UUID vendorId,
        String displayName,
        String contactEmail
) {}
