package com.arqops.iam.repository;

import com.arqops.iam.entity.TenantOutboundSmtp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TenantOutboundSmtpRepository extends JpaRepository<TenantOutboundSmtp, UUID> {
}
