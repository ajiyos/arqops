package com.arqops.contract.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.util.UUID;

@Entity
@Table(name = "contracts", indexes = {
        @Index(name = "idx_contracts_tenant", columnList = "tenant_id"),
        @Index(name = "idx_contracts_tenant_status", columnList = "tenant_id, status"),
        @Index(name = "idx_contracts_project", columnList = "tenant_id, project_id")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contract extends TenantAwareEntity {

    @Column(name = "project_id")
    private UUID projectId;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "draft";

    @Column(name = "created_by")
    private UUID createdBy;
}
