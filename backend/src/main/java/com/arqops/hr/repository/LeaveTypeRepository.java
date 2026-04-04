package com.arqops.hr.repository;

import com.arqops.hr.entity.LeaveType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LeaveTypeRepository extends JpaRepository<LeaveType, UUID> {
}
