package com.arqops.common.audit;

import com.arqops.common.security.UserPrincipal;
import com.arqops.common.tenancy.AsyncAuditContext;
import com.arqops.common.tenancy.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Async
    public void log(String entityType, UUID entityId, String action, Map<String, Object> changes) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        UUID userId = getCurrentUserId();
        String ipAddress = getClientIp();

        AuditLog entry = AuditLog.builder()
                .tenantId(tenantId)
                .userId(userId)
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .changes(changes)
                .ipAddress(ipAddress)
                .build();

        auditLogRepository.save(entry);
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.userId();
        }
        return null;
    }

    private String getClientIp() {
        String fromAsync = AsyncAuditContext.getClientIp();
        if (fromAsync != null && !fromAsync.isBlank()) {
            return fromAsync;
        }
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
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
