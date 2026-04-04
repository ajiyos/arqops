package com.arqops.project.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "projects")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project extends TenantAwareEntity {

    @Column(name = "client_id")
    private UUID clientId;

    @Column(name = "lead_id")
    private UUID leadId;

    @Column(nullable = false)
    private String name;

    @Column(length = 50)
    private String type;

    @Column(length = 255)
    private String location;

    @Column(name = "site_address", columnDefinition = "TEXT")
    private String siteAddress;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "target_end_date")
    private LocalDate targetEndDate;

    @Column(precision = 15, scale = 2)
    private BigDecimal value;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "active";
}
