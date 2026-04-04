package com.arqops.crm.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "lead_stages", indexes = {
        @Index(name = "idx_lead_stage_tenant", columnList = "tenant_id")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeadStage extends TenantAwareEntity {

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;
}
