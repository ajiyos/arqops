package com.arqops.crm.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.crm.dto.ClientRequest;
import com.arqops.crm.dto.ClientResponse;
import com.arqops.crm.entity.Client;
import com.arqops.crm.repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;
    private final AuditService auditService;

    public Page<ClientResponse> list(Pageable pageable, String search) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Page<Client> page = (search != null && !search.isBlank())
                ? clientRepository.findByTenantIdAndNameContainingIgnoreCase(tenantId, search.trim(), pageable)
                : clientRepository.findByTenantId(tenantId, pageable);
        return page.map(ClientResponse::from);
    }

    public ClientResponse getById(UUID id) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Client", id));
        return ClientResponse.from(client);
    }

    @Transactional
    public ClientResponse create(ClientRequest request) {
        Client client = Client.builder()
                .name(request.name())
                .type(request.type() != null ? request.type() : "company")
                .gstin(request.gstin())
                .pan(request.pan())
                .billingAddress(request.billingAddress())
                .industrySegment(request.industrySegment())
                .createdBy(request.createdBy())
                .build();
        client = clientRepository.save(client);
        auditService.log("Client", client.getId(), "CREATE", Map.of("name", client.getName()));
        return ClientResponse.from(client);
    }

    @Transactional
    public ClientResponse update(UUID id, ClientRequest request) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Client", id));
        client.setName(request.name());
        if (request.type() != null) {
            client.setType(request.type());
        }
        client.setGstin(request.gstin());
        client.setPan(request.pan());
        client.setBillingAddress(request.billingAddress());
        client.setIndustrySegment(request.industrySegment());
        if (request.createdBy() != null) {
            client.setCreatedBy(request.createdBy());
        }
        client = clientRepository.save(client);
        auditService.log("Client", client.getId(), "UPDATE", Map.of("name", client.getName()));
        return ClientResponse.from(client);
    }

    @Transactional
    public void delete(UUID id) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Client", id));
        client.setDeletedAt(Instant.now());
        clientRepository.save(client);
        auditService.log("Client", client.getId(), "DELETE", Map.of("name", client.getName()));
    }
}
