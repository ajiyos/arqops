package com.arqops.iam.repository;

import com.arqops.iam.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {

    Optional<Tenant> findBySubdomainSlug(String subdomainSlug);

    boolean existsBySubdomainSlug(String subdomainSlug);
}
