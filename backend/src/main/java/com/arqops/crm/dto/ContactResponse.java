package com.arqops.crm.dto;

import com.arqops.crm.entity.Contact;
import java.time.Instant;
import java.util.UUID;

public record ContactResponse(
        UUID id,
        UUID clientId,
        String name,
        String designation,
        String email,
        String phone,
        String role,
        Instant createdAt,
        Instant updatedAt
) {
    public static ContactResponse from(Contact c) {
        return new ContactResponse(
                c.getId(), c.getClient().getId(), c.getName(),
                c.getDesignation(), c.getEmail(), c.getPhone(),
                c.getRole(), c.getCreatedAt(), c.getUpdatedAt()
        );
    }
}
