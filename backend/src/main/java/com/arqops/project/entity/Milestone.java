package com.arqops.project.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;

@Entity
@Table(name = "milestones")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Milestone extends TenantAwareEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "phase_id", nullable = false)
    private ProjectPhase phase;

    @Column(nullable = false)
    private String name;

    @Column(name = "target_date")
    private LocalDate targetDate;

    @Column(name = "actual_date")
    private LocalDate actualDate;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "pending";

    @Column(columnDefinition = "TEXT")
    private String deliverables;
}
