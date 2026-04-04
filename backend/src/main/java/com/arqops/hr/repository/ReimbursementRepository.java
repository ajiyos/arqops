package com.arqops.hr.repository;

import com.arqops.hr.entity.Reimbursement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ReimbursementRepository extends JpaRepository<Reimbursement, UUID> {

    Page<Reimbursement> findByEmployeeId(UUID employeeId, Pageable pageable);

    Page<Reimbursement> findByStatus(String status, Pageable pageable);

    Page<Reimbursement> findByEmployeeIdAndStatus(UUID employeeId, String status, Pageable pageable);
}
