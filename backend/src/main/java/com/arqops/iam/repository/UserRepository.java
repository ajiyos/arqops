package com.arqops.iam.repository;

import com.arqops.iam.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    @Query("SELECT u FROM User u WHERE u.tenantId = :tenantId AND u.email = :email")
    Optional<User> findByTenantIdAndEmail(UUID tenantId, String email);

    @Query("SELECT u FROM User u WHERE u.email = :email AND u.deletedAt IS NULL")
    Optional<User> findByEmail(String email);

    Page<User> findByTenantId(UUID tenantId, Pageable pageable);

    boolean existsByTenantIdAndEmail(UUID tenantId, String email);
}
