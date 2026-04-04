package com.arqops.crm.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "activities", indexes = {
        @Index(name = "idx_activity_tenant", columnList = "tenant_id"),
        @Index(name = "idx_activity_entity", columnList = "tenant_id, entity_type, entity_id")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Activity extends TenantAwareEntity {

    @Column(name = "entity_type", nullable = false, length = 30)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(nullable = false, length = 30)
    private String type;

    @Column(columnDefinition = "text")
    private String description;

    @Column(nullable = false)
    private Instant date;

    @Column(name = "assigned_to")
    private UUID assignedTo;
}
