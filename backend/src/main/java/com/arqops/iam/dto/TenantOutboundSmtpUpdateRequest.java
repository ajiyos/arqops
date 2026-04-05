package com.arqops.iam.dto;

public record TenantOutboundSmtpUpdateRequest(
        String smtpHost,
        Integer smtpPort,
        String smtpUsername,
        String smtpPassword,
        String fromEmail,
        Boolean starttlsEnabled,
        Boolean smtpSsl
) {}
