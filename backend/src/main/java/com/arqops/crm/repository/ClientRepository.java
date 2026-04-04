package com.arqops.crm.repository;

import com.arqops.crm.entity.Client;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ClientRepository extends JpaRepository<Client, UUID> {

    Page<Client> findByTenantId(UUID tenantId, Pageable pageable);

    Page<Client> findByTenantIdAndNameContainingIgnoreCase(UUID tenantId, String name, Pageable pageable);
}
