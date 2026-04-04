package com.arqops.crm.repository;

import com.arqops.crm.entity.Contact;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ContactRepository extends JpaRepository<Contact, UUID> {

    List<Contact> findByTenantIdAndClientId(UUID tenantId, UUID clientId);
}
