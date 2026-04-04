package com.arqops.finance.repository;

import com.arqops.finance.entity.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Page<Invoice> findByTenantId(UUID tenantId, Pageable pageable);

    Optional<Invoice> findByTenantIdAndInvoiceNumber(UUID tenantId, String invoiceNumber);
}
