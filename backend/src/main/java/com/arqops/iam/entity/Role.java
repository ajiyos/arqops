package com.arqops.iam.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Entity
@Table(name = "roles", indexes = {
        @Index(name = "idx_role_tenant_name", columnList = "tenant_id, name", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role extends TenantAwareEntity {

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "is_system_role")
    @Builder.Default
    private boolean systemRole = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "permissions_json", columnDefinition = "jsonb")
    private List<String> permissions;
}
