package com.arqops.vendor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VendorRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 50) String category,
        @Size(max = 100) String specialty,
        @Size(max = 20) String gstin,
        @Size(max = 10) String pan,
        String bankDetailsEncrypted,
        String address,
        @Size(max = 20) String phone,
        @Size(max = 255) String email,
        @Size(max = 20) String status
) {}
