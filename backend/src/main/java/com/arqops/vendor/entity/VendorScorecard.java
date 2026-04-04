package com.arqops.vendor.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.util.UUID;

@Entity
@Table(name = "vendor_scorecards", indexes = {
        @Index(name = "idx_scorecard_tenant", columnList = "tenant_id"),
        @Index(name = "idx_scorecard_vendor", columnList = "tenant_id, vendor_id")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorScorecard extends TenantAwareEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false)
    private Vendor vendor;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "quality_rating")
    private Integer qualityRating;

    @Column(name = "timeliness_rating")
    private Integer timelinessRating;

    @Column(name = "cost_rating")
    private Integer costRating;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
