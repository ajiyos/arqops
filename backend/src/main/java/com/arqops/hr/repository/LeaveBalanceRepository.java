package com.arqops.hr.repository;

import com.arqops.hr.entity.LeaveBalance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, UUID> {

    List<LeaveBalance> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);
}
