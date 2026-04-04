package com.arqops.vendor.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "vendors", indexes = {
        @Index(name = "idx_vendor_tenant", columnList = "tenant_id"),
        @Index(name = "idx_vendor_tenant_status", columnList = "tenant_id, status"),
        @Index(name = "idx_vendor_tenant_name", columnList = "tenant_id, name")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vendor extends TenantAwareEntity {

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 50)
    private String category;

    @Column(length = 100)
    private String specialty;

    @Column(length = 20)
    private String gstin;

    @Column(length = 10)
    private String pan;

    @Column(name = "bank_details_encrypted", columnDefinition = "TEXT")
    private String bankDetailsEncrypted;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 20)
    private String phone;

    @Column(length = 255)
    private String email;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "active";
}
