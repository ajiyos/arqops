package com.arqops.crm.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.crm.dto.ClientRequest;
import com.arqops.crm.dto.ClientResponse;
import com.arqops.crm.dto.ContactRequest;
import com.arqops.crm.dto.ContactResponse;
import com.arqops.crm.service.ClientService;
import com.arqops.crm.service.ContactService;
import jakarta.persistence.EntityManager;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/crm/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;
    private final ContactService contactService;
    private final EntityManager entityManager;

    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ClientResponse>>> list(
            Pageable pageable,
            @RequestParam(required = false) String search) {
        Page<ClientResponse> page = clientService.list(pageable, search);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ClientResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(clientService.getById(id)));
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PostMapping
    public ResponseEntity<ApiResponse<ClientResponse>> create(
            @Valid @RequestBody ClientRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(clientService.create(request)));
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ClientResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody ClientRequest request) {
        return ResponseEntity.ok(ApiResponse.success(clientService.update(id, request)));
    }

    @PreAuthorize("hasAuthority('crm.delete')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        clientService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping("/{clientId}/contacts")
    public ResponseEntity<ApiResponse<List<ContactResponse>>> listContacts(@PathVariable UUID clientId) {
        return ResponseEntity.ok(ApiResponse.success(contactService.listByClient(clientId)));
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PostMapping("/{clientId}/contacts")
    public ResponseEntity<ApiResponse<ContactResponse>> createContact(
            @PathVariable UUID clientId, @Valid @RequestBody ContactRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(contactService.create(clientId, request)));
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PutMapping("/{clientId}/contacts/{contactId}")
    public ResponseEntity<ApiResponse<ContactResponse>> updateContact(
            @PathVariable UUID clientId,
            @PathVariable UUID contactId,
            @Valid @RequestBody ContactRequest request) {
        return ResponseEntity.ok(ApiResponse.success(contactService.update(contactId, request)));
    }

    @PreAuthorize("hasAuthority('crm.delete')")
    @DeleteMapping("/{clientId}/contacts/{contactId}")
    public ResponseEntity<ApiResponse<Void>> deleteContact(
            @PathVariable UUID clientId, @PathVariable UUID contactId) {
        contactService.delete(contactId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @SuppressWarnings("unchecked")
    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping("/{clientId}/history")
    public ResponseEntity<ApiResponse<Map<String, Object>>> clientHistory(@PathVariable UUID clientId) {
        UUID tid = TenantContext.getCurrentTenantId();
        Map<String, Object> history = new HashMap<>();

        List<Object[]> projects = entityManager.createNativeQuery("""
                SELECT id, name, status, COALESCE(value, 0) FROM projects
                WHERE client_id = :cid AND tenant_id = :tid AND deleted_at IS NULL ORDER BY created_at DESC
                """).setParameter("cid", clientId).setParameter("tid", tid).getResultList();
        history.put("projects", projects.stream().map(r -> Map.of(
                "id", r[0].toString(), "name", r[1].toString(), "status", r[2].toString(),
                "value", r[3] instanceof BigDecimal bd ? bd : BigDecimal.ZERO)).toList());

        List<Object[]> invoices = entityManager.createNativeQuery("""
                SELECT invoice_number, total, status, date FROM invoices
                WHERE client_id = :cid AND tenant_id = :tid AND deleted_at IS NULL ORDER BY date DESC
                """).setParameter("cid", clientId).setParameter("tid", tid).getResultList();
        history.put("invoices", invoices.stream().map(r -> Map.of(
                "invoiceNumber", r[0].toString(), "total", r[1], "status", r[2].toString(),
                "date", r[3].toString())).toList());

        List<Object[]> leads = entityManager.createNativeQuery("""
                SELECT id, title, stage, COALESCE(estimated_value, 0) FROM leads
                WHERE client_id = :cid AND tenant_id = :tid AND deleted_at IS NULL ORDER BY created_at DESC
                """).setParameter("cid", clientId).setParameter("tid", tid).getResultList();
        history.put("leads", leads.stream().map(r -> Map.of(
                "id", r[0].toString(), "title", r[1].toString(), "stage", r[2].toString(),
                "estimatedValue", r[3] instanceof BigDecimal bd ? bd : BigDecimal.ZERO)).toList());

        Object[] totals = (Object[]) entityManager.createNativeQuery("""
                SELECT COALESCE(SUM(total), 0) AS total_invoiced,
                       COALESCE((SELECT SUM(p.amount) FROM payments p
                           JOIN invoices i ON p.invoice_id = i.id
                           WHERE i.client_id = :cid AND i.tenant_id = :tid AND i.deleted_at IS NULL AND p.deleted_at IS NULL), 0) AS total_paid
                FROM invoices WHERE client_id = :cid AND tenant_id = :tid AND deleted_at IS NULL
                """).setParameter("cid", clientId).setParameter("tid", tid).getSingleResult();
        history.put("totalInvoiced", totals[0]);
        history.put("totalPaid", totals[1]);

        return ResponseEntity.ok(ApiResponse.success(history));
    }
}
