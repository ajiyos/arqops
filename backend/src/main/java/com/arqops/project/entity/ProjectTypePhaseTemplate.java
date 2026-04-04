package com.arqops.project.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "project_type_phase_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectTypePhaseTemplate extends TenantAwareEntity {

    @Column(name = "project_type", nullable = false, length = 50)
    private String projectType;

    @Column(name = "phase_name", nullable = false, length = 100)
    private String phaseName;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @OneToMany(mappedBy = "phaseTemplate", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    private List<ProjectTypeMilestoneTemplate> milestoneTemplates = new ArrayList<>();
}
