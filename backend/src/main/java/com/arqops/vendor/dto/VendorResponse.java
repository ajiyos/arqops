package com.arqops.vendor.dto;

import com.arqops.vendor.entity.Vendor;

import java.time.Instant;
import java.util.UUID;

public record VendorResponse(
        UUID id,
        String name,
        String category,
        String specialty,
        String gstin,
        String pan,
        String bankDetailsEncrypted,
        String address,
        String phone,
        String email,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static VendorResponse from(Vendor v) {
        return new VendorResponse(
                v.getId(),
                v.getName(),
                v.getCategory(),
                v.getSpecialty(),
                v.getGstin(),
                v.getPan(),
                v.getBankDetailsEncrypted(),
                v.getAddress(),
                v.getPhone(),
                v.getEmail(),
                v.getStatus(),
                v.getCreatedAt(),
                v.getUpdatedAt());
    }

    public static VendorResponse from(Vendor v, String decryptedPan, String decryptedBank) {
        return new VendorResponse(
                v.getId(),
                v.getName(),
                v.getCategory(),
                v.getSpecialty(),
                v.getGstin(),
                decryptedPan,
                decryptedBank,
                v.getAddress(),
                v.getPhone(),
                v.getEmail(),
                v.getStatus(),
                v.getCreatedAt(),
                v.getUpdatedAt());
    }
}
