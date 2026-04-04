package com.arqops.finance.repository;

import com.arqops.finance.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByTenantIdAndInvoice_Id(UUID tenantId, UUID invoiceId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.tenantId = :tenantId AND p.invoice.id = :invoiceId")
    BigDecimal sumAmountByTenantIdAndInvoiceId(@Param("tenantId") UUID tenantId, @Param("invoiceId") UUID invoiceId);
}
