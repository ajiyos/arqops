package com.arqops.contract.repository;

import com.arqops.contract.entity.ContractParty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ContractPartyRepository extends JpaRepository<ContractParty, UUID> {

    List<ContractParty> findByContract_IdOrderByCreatedAtAsc(UUID contractId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE contract_parties SET deleted_at = now() WHERE contract_id = :contractId AND tenant_id = :tenantId AND deleted_at IS NULL", nativeQuery = true)
    int softDeleteByContractId(@Param("contractId") UUID contractId, @Param("tenantId") UUID tenantId);
}
