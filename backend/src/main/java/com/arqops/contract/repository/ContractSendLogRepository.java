package com.arqops.contract.repository;

import com.arqops.contract.entity.ContractSendLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ContractSendLogRepository extends JpaRepository<ContractSendLog, UUID> {

    List<ContractSendLog> findByContract_IdOrderByCreatedAtDesc(UUID contractId);
}
