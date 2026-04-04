package com.arqops.crm.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "clients", indexes = {
        @Index(name = "idx_client_tenant", columnList = "tenant_id"),
        @Index(name = "idx_client_tenant_name", columnList = "tenant_id, name")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Client extends TenantAwareEntity {

    @Column(nullable = false)
    private String name;

    @Column(length = 20)
    @Builder.Default
    private String type = "company";

    @Column(length = 20)
    private String gstin;

    @Column(length = 10)
    private String pan;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "billing_address_json", columnDefinition = "jsonb")
    private Map<String, Object> billingAddress;

    @Column(name = "industry_segment", length = 100)
    private String industrySegment;

    @Column(name = "created_by")
    private UUID createdBy;

    @OneToMany(mappedBy = "client", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Contact> contacts = new ArrayList<>();
}
