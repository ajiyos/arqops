package com.arqops.iam.repository;

import com.arqops.iam.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {

    List<Role> findByTenantId(UUID tenantId);

    Optional<Role> findByTenantIdAndName(UUID tenantId, String name);
}
