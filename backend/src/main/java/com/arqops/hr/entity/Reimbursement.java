package com.arqops.hr.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "reimbursements", indexes = {
        @Index(name = "idx_reimburse_tenant", columnList = "tenant_id"),
        @Index(name = "idx_reimburse_employee", columnList = "tenant_id, employee_id")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reimbursement extends TenantAwareEntity {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "receipt_storage_key", length = 500)
    private String receiptStorageKey;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "pending";

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "expense_id")
    private UUID expenseId;
}
