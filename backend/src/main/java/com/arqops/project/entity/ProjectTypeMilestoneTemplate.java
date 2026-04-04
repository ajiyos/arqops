package com.arqops.project.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "project_type_milestone_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectTypeMilestoneTemplate extends TenantAwareEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "phase_template_id", nullable = false)
    private ProjectTypePhaseTemplate phaseTemplate;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;
}
