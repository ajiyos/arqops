package com.arqops.hr.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "time_entries")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeEntry extends TenantAwareEntity {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(nullable = false, precision = 7, scale = 2)
    private BigDecimal hours;

    @Column(nullable = false)
    private boolean billable;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
