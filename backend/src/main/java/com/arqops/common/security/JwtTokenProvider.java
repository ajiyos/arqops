package com.arqops.common.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long accessTokenExpiry;
    private final long refreshTokenExpiry;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-expiry}") long accessTokenExpiry,
            @Value("${app.jwt.refresh-token-expiry}") long refreshTokenExpiry) {
        byte[] keyBytes = secret.length() >= 64
                ? secret.getBytes()
                : Decoders.BASE64.decode(secret);
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenExpiry = accessTokenExpiry * 1000;
        this.refreshTokenExpiry = refreshTokenExpiry * 1000;
    }

    public String generateAccessToken(UUID userId, UUID tenantId, String email,
                                      List<String> roles, List<String> permissions) {
        Date now = new Date();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("tenant_id", tenantId.toString())
                .claim("email", email)
                .claim("roles", roles)
                .claim("permissions", permissions)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessTokenExpiry))
                .signWith(key)
                .compact();
    }

    public String generatePlatformAccessToken(UUID userId, String email) {
        Date now = new Date();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("platform", true)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessTokenExpiry))
                .signWith(key)
                .compact();
    }

    /**
     * Includes a random JWT ID so concurrent issues for the same user never produce identical strings
     * (required: {@code refresh_tokens.token} is unique in the database).
     */
    public String generateRefreshToken(UUID userId) {
        Date now = new Date();
        return Jwts.builder()
                .subject(userId.toString())
                .id(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + refreshTokenExpiry))
                .signWith(key)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public UUID getUserId(String token) {
        return UUID.fromString(parseToken(token).getSubject());
    }

    public boolean isPlatformToken(String token) {
        return Boolean.TRUE.equals(parseToken(token).get("platform", Boolean.class));
    }

    public UUID getTenantId(String token) {
        Claims c = parseToken(token);
        if (Boolean.TRUE.equals(c.get("platform", Boolean.class))) {
            return null;
        }
        String tid = c.get("tenant_id", String.class);
        return tid != null ? UUID.fromString(tid) : null;
    }

    @SuppressWarnings("unchecked")
    public List<String> getRoles(String token) {
        List<String> roles = parseToken(token).get("roles", List.class);
        return roles != null ? roles : List.of();
    }

    @SuppressWarnings("unchecked")
    public List<String> getPermissions(String token) {
        List<String> perms = parseToken(token).get("permissions", List.class);
        return perms != null ? perms : List.of();
    }

    private static final String GOOGLE_DRIVE_OAUTH_PURPOSE = "google_drive_oauth";

    public String generateGoogleDriveOAuthState(UUID tenantId, UUID userId) {
        Date now = new Date();
        return Jwts.builder()
                .claim("purpose", GOOGLE_DRIVE_OAUTH_PURPOSE)
                .claim("tenant_id", tenantId.toString())
                .claim("user_id", userId.toString())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + 600_000))
                .signWith(key)
                .compact();
    }

    public GoogleDriveOAuthState parseGoogleDriveOAuthState(String state) {
        Claims c = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(state)
                .getPayload();
        if (!GOOGLE_DRIVE_OAUTH_PURPOSE.equals(c.get("purpose", String.class))) {
            throw new JwtException("Invalid OAuth state");
        }
        return new GoogleDriveOAuthState(
                UUID.fromString(c.get("tenant_id", String.class)),
                UUID.fromString(c.get("user_id", String.class)));
    }
}
