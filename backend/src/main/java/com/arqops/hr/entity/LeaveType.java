package com.arqops.hr.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "leave_types", indexes = @Index(name = "idx_leave_type_tenant", columnList = "tenant_id"))
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveType extends TenantAwareEntity {

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "annual_quota")
    @Builder.Default
    private Integer annualQuota = 0;

    @Column(name = "carry_forward_limit")
    @Builder.Default
    private Integer carryForwardLimit = 0;
}
