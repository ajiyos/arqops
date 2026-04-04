package com.arqops.project.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;

@Entity
@Table(name = "project_budget_lines")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectBudgetLine extends TenantAwareEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(name = "budgeted_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal budgetedAmount = BigDecimal.ZERO;

    @Column(name = "actual_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal actualAmount = BigDecimal.ZERO;
}
