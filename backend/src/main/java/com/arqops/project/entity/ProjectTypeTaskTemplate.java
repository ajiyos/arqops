package com.arqops.project.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "project_type_task_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectTypeTaskTemplate extends TenantAwareEntity {

    @Column(name = "project_type", nullable = false, length = 50)
    private String projectType;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String priority = "medium";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "todo";

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;
}
