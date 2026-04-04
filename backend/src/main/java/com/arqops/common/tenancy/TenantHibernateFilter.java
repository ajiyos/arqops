package com.arqops.common.tenancy;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.hibernate.Session;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Aspect
@Component
@RequiredArgsConstructor
public class TenantHibernateFilter {

    private final EntityManager entityManager;

    /**
     * Enable the Hibernate tenant filter only for tenant-aware repositories.
     * Excludes platform-level repos (PlatformUser, PlatformRefreshToken, RefreshToken, Tenant)
     * that don't carry tenant_id or are queried before authentication.
     */
    @Before("execution(* com.arqops..repository.*Repository.*(..)) " +
            "&& !execution(* com.arqops.iam.repository.PlatformUserRepository.*(..)) " +
            "&& !execution(* com.arqops.iam.repository.PlatformRefreshTokenRepository.*(..)) " +
            "&& !execution(* com.arqops.iam.repository.RefreshTokenRepository.*(..)) " +
            "&& !execution(* com.arqops.iam.repository.TenantRepository.*(..))")
    public void enableTenantFilter() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Session session = entityManager.unwrap(Session.class);
        if (tenantId != null) {
            session.enableFilter("tenantFilter").setParameter("tenantId", tenantId);
        } else {
            session.disableFilter("tenantFilter");
        }
    }
}
