package com.arqops.contract.repository;

import com.arqops.contract.entity.ContractRevision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContractRevisionRepository extends JpaRepository<ContractRevision, UUID> {

    List<ContractRevision> findByContract_IdAndDeletedAtIsNullOrderByRevisionNumberDesc(UUID contractId);

    @Query("SELECT COALESCE(MAX(r.revisionNumber), 0) FROM ContractRevision r WHERE r.contract.id = :contractId AND r.deletedAt IS NULL")
    int maxRevisionNumber(@Param("contractId") UUID contractId);

    Optional<ContractRevision> findByIdAndContract_IdAndTenantId(UUID id, UUID contractId, UUID tenantId);
}
