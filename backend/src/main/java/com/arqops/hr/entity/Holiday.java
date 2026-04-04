package com.arqops.hr.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;

@Entity
@Table(name = "holidays", indexes = @Index(name = "idx_holiday_tenant", columnList = "tenant_id"))
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Holiday extends TenantAwareEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private LocalDate date;

    @Column(length = 30)
    @Builder.Default
    private String type = "national";
}
