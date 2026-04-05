package com.arqops.iam.dto;

public record TenantOutboundSmtpResponse(
        String smtpHost,
        int smtpPort,
        String smtpUsername,
        String fromEmail,
        boolean starttlsEnabled,
        boolean smtpSsl,
        boolean passwordConfigured
) {}
