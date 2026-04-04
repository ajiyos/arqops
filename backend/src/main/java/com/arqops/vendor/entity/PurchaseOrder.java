package com.arqops.vendor.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "purchase_orders", indexes = {
        @Index(name = "idx_po_tenant", columnList = "tenant_id"),
        @Index(name = "idx_po_wo", columnList = "tenant_id, work_order_id")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrder extends TenantAwareEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id")
    private WorkOrder workOrder;

    @Column(name = "po_number", length = 50)
    private String poNumber;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "line_items_json", columnDefinition = "jsonb")
    private Map<String, Object> lineItems;

    @Column(name = "gst_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal gstAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal total = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "draft";

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;
}
