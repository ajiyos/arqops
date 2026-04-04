package com.arqops.crm.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.crm.dto.ContactRequest;
import com.arqops.crm.dto.ContactResponse;
import com.arqops.crm.entity.Client;
import com.arqops.crm.entity.Contact;
import com.arqops.crm.repository.ClientRepository;
import com.arqops.crm.repository.ContactRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ContactService {

    private final ContactRepository contactRepository;
    private final ClientRepository clientRepository;
    private final AuditService auditService;

    public List<ContactResponse> listByClient(UUID clientId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        return contactRepository.findByTenantIdAndClientId(tenantId, clientId)
                .stream().map(ContactResponse::from).toList();
    }

    @Transactional
    public ContactResponse create(UUID clientId, ContactRequest request) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> AppException.notFound("Client", clientId));
        Contact contact = Contact.builder()
                .client(client)
                .name(request.name())
                .designation(request.designation())
                .email(request.email())
                .phone(request.phone())
                .role(request.role())
                .build();
        contact = contactRepository.save(contact);
        auditService.log("Contact", contact.getId(), "CREATE", Map.of("name", contact.getName()));
        return ContactResponse.from(contact);
    }

    @Transactional
    public ContactResponse update(UUID contactId, ContactRequest request) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> AppException.notFound("Contact", contactId));
        contact.setName(request.name());
        contact.setDesignation(request.designation());
        contact.setEmail(request.email());
        contact.setPhone(request.phone());
        contact.setRole(request.role());
        contact = contactRepository.save(contact);
        auditService.log("Contact", contact.getId(), "UPDATE", Map.of("name", contact.getName()));
        return ContactResponse.from(contact);
    }

    @Transactional
    public void delete(UUID contactId) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> AppException.notFound("Contact", contactId));
        contact.setDeletedAt(Instant.now());
        contactRepository.save(contact);
        auditService.log("Contact", contact.getId(), "DELETE", Map.of("name", contact.getName()));
    }
}
