package com.arqops.common.tenancy;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.task.TaskDecorator;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.UUID;

/**
 * Propagates tenant and security context (and captured client IP) from the HTTP thread to {@code @Async} workers.
 * Without this, {@link org.springframework.security.core.context.SecurityContextHolder} is empty on async threads,
 * so audit logs miss user id; {@link RequestContextHolder} is also unavailable, so IP is missing.
 */
public class TenantAwareTaskDecorator implements TaskDecorator {

    @Override
    public Runnable decorate(Runnable runnable) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        SecurityContext securityContext = SecurityContextHolder.getContext();
        Authentication authentication = securityContext != null ? securityContext.getAuthentication() : null;
        String clientIp = captureClientIp();

        return () -> {
            try {
                if (tenantId != null) {
                    TenantContext.setCurrentTenantId(tenantId);
                }
                if (authentication != null) {
                    SecurityContext copy = SecurityContextHolder.createEmptyContext();
                    copy.setAuthentication(authentication);
                    SecurityContextHolder.setContext(copy);
                }
                if (clientIp != null) {
                    AsyncAuditContext.setClientIp(clientIp);
                }
                runnable.run();
            } finally {
                TenantContext.clear();
                SecurityContextHolder.clearContext();
                AsyncAuditContext.clear();
            }
        };
    }

    private static String captureClientIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                String xForwardedFor = request.getHeader("X-Forwarded-For");
                return xForwardedFor != null ? xForwardedFor.split(",")[0].trim() : request.getRemoteAddr();
            }
        } catch (Exception ignored) {
            // ignore
        }
        return null;
    }
}
