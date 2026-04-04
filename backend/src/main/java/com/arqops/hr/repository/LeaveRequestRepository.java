package com.arqops.hr.repository;

import com.arqops.hr.entity.LeaveRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {

    Page<LeaveRequest> findByEmployeeId(UUID employeeId, Pageable pageable);
}
