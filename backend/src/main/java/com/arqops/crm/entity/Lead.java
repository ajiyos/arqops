package com.arqops.crm.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "leads", indexes = {
        @Index(name = "idx_lead_tenant", columnList = "tenant_id"),
        @Index(name = "idx_lead_tenant_stage", columnList = "tenant_id, stage"),
        @Index(name = "idx_lead_tenant_assigned", columnList = "tenant_id, assigned_to")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lead extends TenantAwareEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client;

    @Column(nullable = false)
    private String title;

    @Column(length = 50)
    private String source;

    @Column(name = "project_type", length = 50)
    private String projectType;

    @Column(name = "estimated_value", precision = 15, scale = 2)
    private BigDecimal estimatedValue;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String stage = "New";

    @Column(name = "stage_id")
    private UUID stageId;

    @Column(length = 255)
    private String location;

    @Column(name = "assigned_to")
    private UUID assignedTo;

    @Column(columnDefinition = "text")
    private String notes;
}
