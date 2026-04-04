package com.arqops.hr.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "attendance", indexes = {
        @Index(name = "idx_attendance_tenant", columnList = "tenant_id"),
        @Index(name = "idx_attendance_employee", columnList = "tenant_id, employee_id, date")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attendance extends TenantAwareEntity {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    /** DB column is "date"; property renamed so Spring Data query methods are not ambiguous (Date reserved). */
    @Column(name = "date", nullable = false)
    private LocalDate attendanceDate;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "check_in_time")
    private LocalTime checkInTime;

    @Column(name = "check_out_time")
    private LocalTime checkOutTime;

    @Column(columnDefinition = "text")
    private String notes;
}
