package com.arqops.hr.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "employees", indexes = {
        @Index(name = "idx_employee_tenant", columnList = "tenant_id"),
        @Index(name = "idx_employee_tenant_status", columnList = "tenant_id, status")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee extends TenantAwareEntity {

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "employee_code", length = 20)
    private String employeeCode;

    @Column(nullable = false)
    private String name;

    @Column(length = 100)
    private String designation;

    @Column(length = 100)
    private String department;

    @Column(name = "date_of_joining")
    private LocalDate dateOfJoining;

    @Column(name = "reporting_manager_id")
    private UUID reportingManagerId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "salary_structure_json", columnDefinition = "jsonb")
    private Map<String, Object> salaryStructureJson;

    @Column(length = 20)
    private String phone;

    @Column(name = "personal_email")
    private String personalEmail;

    @Column(name = "emergency_contact_name", length = 100)
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 20)
    private String emergencyContactPhone;

    @Column(name = "emergency_contact_relation", length = 50)
    private String emergencyContactRelation;

    @Column(name = "pan_encrypted", length = 500)
    private String panEncrypted;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "active";
}
