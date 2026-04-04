package com.arqops.iam.service;

import com.arqops.common.exception.AppException;
import com.arqops.common.security.JwtTokenProvider;
import com.arqops.iam.dto.AuthResponse;
import com.arqops.iam.dto.LoginRequest;
import com.arqops.iam.dto.RefreshTokenRequest;
import com.arqops.iam.entity.RefreshToken;
import com.arqops.iam.entity.Role;
import com.arqops.iam.entity.User;
import com.arqops.iam.repository.RefreshTokenRepository;
import com.arqops.iam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.jwt.refresh-token-expiry}")
    private long refreshTokenExpiry;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> AppException.unauthorized("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw AppException.unauthorized("Invalid email or password");
        }

        if (!"active".equals(user.getStatus())) {
            throw AppException.forbidden("Account is not active");
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        return generateAuthResponse(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        RefreshToken storedToken = refreshTokenRepository
                .findByTokenAndRevokedFalse(request.refreshToken())
                .orElseThrow(() -> AppException.unauthorized("Invalid refresh token"));

        if (storedToken.getExpiresAt().isBefore(Instant.now())) {
            throw AppException.unauthorized("Refresh token expired");
        }

        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        User user = userRepository.findById(storedToken.getUserId())
                .orElseThrow(() -> AppException.unauthorized("User not found"));

        return generateAuthResponse(user);
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenRepository.findByTokenAndRevokedFalse(refreshToken)
                .ifPresent(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });
    }

    private AuthResponse generateAuthResponse(User user) {
        List<String> roleNames = user.getRoles().stream().map(Role::getName).toList();

        List<String> permissions = user.getRoles().stream()
                .flatMap(role -> (role.getPermissions() != null ? role.getPermissions() : List.<String>of()).stream())
                .distinct()
                .toList();

        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId(), user.getTenantId(), user.getEmail(), roleNames, permissions);
        String refreshTokenStr = jwtTokenProvider.generateRefreshToken(user.getId());

        RefreshToken refreshToken = RefreshToken.builder()
                .token(refreshTokenStr)
                .userId(user.getId())
                .expiresAt(Instant.now().plusSeconds(refreshTokenExpiry))
                .build();
        refreshTokenRepository.save(refreshToken);

        List<String> effectivePermissions = roleNames.contains("TENANT_ADMIN")
                ? com.arqops.common.security.Permissions.ALL
                : permissions;

        return new AuthResponse(accessToken, refreshTokenStr,
                user.getId(), user.getTenantId(), user.getName(), user.getEmail(),
                roleNames, effectivePermissions);
    }
}
