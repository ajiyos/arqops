package com.arqops.finance.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.finance.dto.InvoiceRequest;
import com.arqops.finance.dto.InvoiceResponse;
import com.arqops.finance.dto.PaymentRequest;
import com.arqops.finance.dto.PaymentResponse;
import com.arqops.finance.entity.Invoice;
import com.arqops.finance.entity.Payment;
import com.arqops.finance.repository.InvoiceRepository;
import com.arqops.finance.repository.PaymentRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final AuditService auditService;

    @PersistenceContext
    private EntityManager entityManager;

    public Page<InvoiceResponse> list(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        return invoiceRepository.findByTenantId(tenantId, pageable).map(InvoiceResponse::from);
    }

    public InvoiceResponse getById(UUID id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Invoice", id));
        assertTenant(invoice);
        return InvoiceResponse.from(invoice);
    }

    @Transactional
    public InvoiceResponse create(InvoiceRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        String invoiceNumber = allocateNextInvoiceNumber(tenantId, request.invoiceDate());
        assertUniqueInvoiceNumber(tenantId, invoiceNumber, null);
        Invoice invoice = buildInvoice(request, invoiceNumber);
        invoice.setTenantId(tenantId);
        invoice = invoiceRepository.save(invoice);
        auditService.log("Invoice", invoice.getId(), "CREATE",
                Map.of("invoiceNumber", invoice.getInvoiceNumber()));
        return InvoiceResponse.from(invoice);
    }

    @Transactional
    public InvoiceResponse update(UUID id, InvoiceRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Invoice", id));
        assertTenant(invoice);
        if (!StringUtils.hasText(request.invoiceNumber())) {
            throw AppException.badRequest("Invoice number is required");
        }
        assertUniqueInvoiceNumber(tenantId, request.invoiceNumber().trim(), id);
        apply(invoice, request);
        invoice = invoiceRepository.save(invoice);
        auditService.log("Invoice", invoice.getId(), "UPDATE",
                Map.of("invoiceNumber", invoice.getInvoiceNumber()));
        return InvoiceResponse.from(invoice);
    }

    @Transactional
    public void delete(UUID id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Invoice", id));
        assertTenant(invoice);
        invoice.setDeletedAt(java.time.Instant.now());
        invoiceRepository.save(invoice);
        auditService.log("Invoice", invoice.getId(), "DELETE", Map.of());
    }

    @Transactional(readOnly = true)
    public java.util.List<PaymentResponse> listPayments(UUID invoiceId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> AppException.notFound("Invoice", invoiceId));
        assertTenant(invoice);
        return paymentRepository.findByTenantIdAndInvoice_Id(tenantId, invoiceId)
                .stream().map(PaymentResponse::from).toList();
    }

    @Transactional
    public PaymentResponse recordPayment(UUID invoiceId, PaymentRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> AppException.notFound("Invoice", invoiceId));
        assertTenant(invoice);
        Payment payment = Payment.builder()
                .invoice(invoice)
                .amount(request.amount())
                .paymentDate(request.paymentDate())
                .mode(request.mode())
                .reference(request.reference())
                .notes(request.notes())
                .build();
        payment.setTenantId(tenantId);
        payment = paymentRepository.save(payment);
        refreshInvoicePaymentStatus(tenantId, invoice);
        invoiceRepository.save(invoice);
        auditService.log("Payment", payment.getId(), "CREATE",
                Map.of("invoiceId", invoiceId.toString(), "amount", request.amount().toPlainString()));
        return PaymentResponse.from(payment);
    }

    private void refreshInvoicePaymentStatus(UUID tenantId, Invoice invoice) {
        BigDecimal paid = paymentRepository.sumAmountByTenantIdAndInvoiceId(tenantId, invoice.getId());
        BigDecimal total = invoice.getTotal() != null ? invoice.getTotal() : BigDecimal.ZERO;
        if (paid.compareTo(total) >= 0) {
            invoice.setStatus("paid");
        } else if (paid.signum() > 0) {
            invoice.setStatus("partial");
        }
    }

    private void assertUniqueInvoiceNumber(UUID tenantId, String number, UUID excludeId) {
        invoiceRepository.findByTenantIdAndInvoiceNumber(tenantId, number)
                .filter(inv -> excludeId == null || !inv.getId().equals(excludeId))
                .ifPresent(inv -> {
                    throw AppException.conflict("Invoice number already exists: " + number);
                });
    }

    private void assertTenant(Invoice invoice) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId != null && !tenantId.equals(invoice.getTenantId())) {
            throw AppException.forbidden("Access denied");
        }
    }

    /**
     * Atomically allocates the next sequence for the tenant and calendar year of the invoice date,
     * formatted as INV-&lt;year&gt;-&lt;sequence&gt; with a 4-digit sequence.
     */
    private String allocateNextInvoiceNumber(UUID tenantId, java.time.LocalDate invoiceDate) {
        int year = invoiceDate.getYear();
        Object raw = entityManager.createNativeQuery("""
                        INSERT INTO invoice_number_sequences (tenant_id, year, last_value)
                        VALUES (?1, ?2, 1)
                        ON CONFLICT (tenant_id, year) DO UPDATE
                        SET last_value = invoice_number_sequences.last_value + 1
                        RETURNING last_value
                        """)
                .setParameter(1, tenantId)
                .setParameter(2, year)
                .getSingleResult();
        int seq = ((Number) raw).intValue();
        return "INV-" + year + "-" + String.format("%04d", seq);
    }

    private Invoice buildInvoice(InvoiceRequest request, String invoiceNumber) {
        return Invoice.builder()
                .clientId(request.clientId())
                .projectId(request.projectId())
                .invoiceNumber(invoiceNumber)
                .invoiceDate(request.invoiceDate())
                .dueDate(request.dueDate())
                .lineItemsJson(request.lineItemsJson())
                .sacCode(request.sacCode())
                .cgst(zeroDefault(request.cgst()))
                .sgst(zeroDefault(request.sgst()))
                .igst(zeroDefault(request.igst()))
                .total(request.total())
                .status(request.status() != null ? request.status() : "draft")
                .build();
    }

    private void apply(Invoice invoice, InvoiceRequest request) {
        invoice.setClientId(request.clientId());
        invoice.setProjectId(request.projectId());
        invoice.setInvoiceNumber(request.invoiceNumber().trim());
        invoice.setInvoiceDate(request.invoiceDate());
        invoice.setDueDate(request.dueDate());
        invoice.setLineItemsJson(request.lineItemsJson());
        invoice.setSacCode(request.sacCode());
        invoice.setCgst(zeroDefault(request.cgst()));
        invoice.setSgst(zeroDefault(request.sgst()));
        invoice.setIgst(zeroDefault(request.igst()));
        invoice.setTotal(request.total());
        if (request.status() != null) {
            invoice.setStatus(request.status());
        }
    }

    private static BigDecimal zeroDefault(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
