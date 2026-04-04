package com.arqops.vendor.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "work_orders", indexes = {
        @Index(name = "idx_wo_tenant", columnList = "tenant_id"),
        @Index(name = "idx_wo_vendor", columnList = "tenant_id, vendor_id"),
        @Index(name = "idx_wo_project", columnList = "tenant_id, project_id")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrder extends TenantAwareEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false)
    private Vendor vendor;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "wo_number", length = 50)
    private String woNumber;

    @Column(columnDefinition = "TEXT")
    private String scope;

    @Column(precision = 15, scale = 2)
    private BigDecimal value;

    @Column(name = "payment_terms", columnDefinition = "TEXT")
    private String paymentTerms;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "draft";

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;
}
