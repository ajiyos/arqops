package com.arqops.iam.repository;

import com.arqops.iam.entity.PlatformRefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PlatformRefreshTokenRepository extends JpaRepository<PlatformRefreshToken, UUID> {

    Optional<PlatformRefreshToken> findByTokenAndRevokedFalse(String token);
}
