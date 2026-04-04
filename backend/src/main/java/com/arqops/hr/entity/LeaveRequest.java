package com.arqops.hr.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "leave_requests", indexes = {
        @Index(name = "idx_leave_tenant", columnList = "tenant_id"),
        @Index(name = "idx_leave_employee", columnList = "tenant_id, employee_id"),
        @Index(name = "idx_leave_status", columnList = "tenant_id, status")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveRequest extends TenantAwareEntity {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "leave_type_id", nullable = false)
    private UUID leaveTypeId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal days;

    @Column(columnDefinition = "text")
    private String reason;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "pending";

    @Column(name = "approved_by")
    private UUID approvedBy;
}
