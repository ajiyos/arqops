package com.arqops.contract.repository;

import com.arqops.contract.entity.ContractSignedDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContractSignedDocumentRepository extends JpaRepository<ContractSignedDocument, UUID> {

    List<ContractSignedDocument> findByContract_IdOrderByUploadedAtDesc(UUID contractId);

    Optional<ContractSignedDocument> findByIdAndContract_IdAndTenantId(UUID id, UUID contractId, UUID tenantId);
}
