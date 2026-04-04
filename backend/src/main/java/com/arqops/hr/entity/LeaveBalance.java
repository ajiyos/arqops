package com.arqops.hr.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "leave_balances", indexes = @Index(name = "idx_leave_bal_tenant", columnList = "tenant_id"))
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveBalance extends TenantAwareEntity {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "leave_type_id", nullable = false)
    private UUID leaveTypeId;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false, precision = 5, scale = 1)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;
}
