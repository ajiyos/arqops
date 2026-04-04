package com.arqops.finance.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "vendor_bills")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorBill extends TenantAwareEntity {

    @Column(name = "vendor_id", nullable = false)
    private UUID vendorId;

    @Column(name = "work_order_id")
    private UUID workOrderId;

    @Column(name = "bill_number", length = 50)
    private String billNumber;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "gst_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal gstAmount = BigDecimal.ZERO;

    @Column(name = "tds_section", length = 10)
    private String tdsSection;

    @Column(name = "tds_rate", precision = 5, scale = 2)
    private BigDecimal tdsRate;

    @Column(name = "tds_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal tdsAmount = BigDecimal.ZERO;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "pending";

    @Column(name = "paid_at")
    private Instant paidAt;
}
