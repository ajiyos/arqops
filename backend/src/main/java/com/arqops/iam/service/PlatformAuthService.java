package com.arqops.iam.service;

import com.arqops.common.exception.AppException;
import com.arqops.common.security.JwtTokenProvider;
import com.arqops.iam.dto.LoginRequest;
import com.arqops.iam.dto.PlatformAuthResponse;
import com.arqops.iam.dto.RefreshTokenRequest;
import com.arqops.iam.entity.PlatformRefreshToken;
import com.arqops.iam.entity.PlatformUser;
import com.arqops.iam.repository.PlatformRefreshTokenRepository;
import com.arqops.iam.repository.PlatformUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class PlatformAuthService {

    private final PlatformUserRepository platformUserRepository;
    private final PlatformRefreshTokenRepository platformRefreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.jwt.refresh-token-expiry}")
    private long refreshTokenExpiry;

    @Transactional
    public PlatformAuthResponse login(LoginRequest request) {
        PlatformUser user = platformUserRepository.findByEmail(request.email())
                .orElseThrow(() -> AppException.unauthorized("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw AppException.unauthorized("Invalid email or password");
        }

        if (!"active".equals(user.getStatus())) {
            throw AppException.forbidden("Account is not active");
        }

        return generateResponse(user);
    }

    @Transactional
    public PlatformAuthResponse refresh(RefreshTokenRequest request) {
        PlatformRefreshToken stored = platformRefreshTokenRepository
                .findByTokenAndRevokedFalse(request.refreshToken())
                .orElseThrow(() -> AppException.unauthorized("Invalid refresh token"));

        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw AppException.unauthorized("Refresh token expired");
        }

        stored.setRevoked(true);
        platformRefreshTokenRepository.save(stored);

        PlatformUser user = platformUserRepository.findById(stored.getPlatformUserId())
                .orElseThrow(() -> AppException.unauthorized("User not found"));

        return generateResponse(user);
    }

    @Transactional
    public void logout(String refreshToken) {
        platformRefreshTokenRepository.findByTokenAndRevokedFalse(refreshToken)
                .ifPresent(t -> {
                    t.setRevoked(true);
                    platformRefreshTokenRepository.save(t);
                });
    }

    private PlatformAuthResponse generateResponse(PlatformUser user) {
        String accessToken = jwtTokenProvider.generatePlatformAccessToken(user.getId(), user.getEmail());
        String refreshTokenStr = jwtTokenProvider.generateRefreshToken(user.getId());

        PlatformRefreshToken rt = PlatformRefreshToken.builder()
                .token(refreshTokenStr)
                .platformUserId(user.getId())
                .expiresAt(Instant.now().plusSeconds(refreshTokenExpiry))
                .build();
        platformRefreshTokenRepository.save(rt);

        return new PlatformAuthResponse(accessToken, refreshTokenStr,
                user.getId(), user.getName(), user.getEmail());
    }
}
