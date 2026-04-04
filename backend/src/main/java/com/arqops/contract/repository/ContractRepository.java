package com.arqops.contract.repository;

import com.arqops.contract.entity.Contract;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ContractRepository extends JpaRepository<Contract, UUID> {

    @Query("""
            SELECT c FROM Contract c
            WHERE c.tenantId = :tenantId
            AND (:projectId IS NULL OR c.projectId = :projectId)
            AND (:status IS NULL OR :status = '' OR c.status = :status)
            AND (:q IS NULL OR :q = '' OR LOWER(c.title) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Contract> search(
            @Param("tenantId") UUID tenantId,
            @Param("projectId") UUID projectId,
            @Param("status") String status,
            @Param("q") String q,
            Pageable pageable);
}
