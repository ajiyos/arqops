package com.arqops.common.security;

import com.arqops.common.tenancy.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (shouldSkipJwtForRequest(request)) {
            TenantContext.clear();
            filterChain.doFilter(request, response);
            return;
        }
        try {
            String token = extractToken(request);
            if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
                UUID userId = jwtTokenProvider.getUserId(token);

                if (jwtTokenProvider.isPlatformToken(token)) {
                    TenantContext.clear();
                    List<SimpleGrantedAuthority> authorities = List.of(
                            new SimpleGrantedAuthority("ROLE_PLATFORM_ADMIN"));
                    String email = jwtTokenProvider.parseToken(token).get("email", String.class);
                    UserPrincipal principal = new UserPrincipal(userId, null, email, List.of("PLATFORM_ADMIN"));
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(principal, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } else {
                    UUID tenantId = jwtTokenProvider.getTenantId(token);
                    List<String> roles = jwtTokenProvider.getRoles(token);
                    List<String> permissions = jwtTokenProvider.getPermissions(token);

                    TenantContext.setCurrentTenantId(tenantId);

                    List<SimpleGrantedAuthority> authorities = new ArrayList<>();

                    for (String role : roles) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
                    }

                    if (roles.contains("TENANT_ADMIN")) {
                        for (String perm : Permissions.ALL) {
                            authorities.add(new SimpleGrantedAuthority(perm));
                        }
                    } else {
                        for (String perm : permissions) {
                            authorities.add(new SimpleGrantedAuthority(perm));
                        }
                    }

                    UserPrincipal principal = new UserPrincipal(userId, tenantId,
                            jwtTokenProvider.parseToken(token).get("email", String.class), roles);

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(principal, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    private static String servletPath(HttpServletRequest request) {
        String path = request.getRequestURI();
        String context = request.getContextPath();
        if (StringUtils.hasText(context) && path.startsWith(context)) {
            path = path.substring(context.length());
        }
        return path;
    }

    /**
     * Login, refresh, tenant self-registration, and Google OAuth callback must not apply a tenant JWT.
     * The callback is a browser GET; skipping JWT avoids rare cases where a stale {@code Authorization}
     * header interferes, and matches anonymous {@code permitAll} semantics.
     */
    private static boolean shouldSkipJwtForRequest(HttpServletRequest request) {
        String path = servletPath(request);
        if ("GET".equalsIgnoreCase(request.getMethod())
                && "/api/v1/tenant/storage/google/callback".equals(path)) {
            return true;
        }
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return false;
        }
        return "/api/v1/auth/login".equals(path)
                || "/api/v1/auth/refresh".equals(path)
                || "/api/v1/tenant".equals(path);
    }
}
