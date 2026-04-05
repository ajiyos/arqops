package com.arqops.iam.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tenant_outbound_smtp")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantOutboundSmtp {

    @Id
    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "smtp_host", nullable = false)
    private String smtpHost;

    @Column(name = "smtp_port", nullable = false)
    @Builder.Default
    private int smtpPort = 587;

    @Column(name = "smtp_username", nullable = false, length = 512)
    private String smtpUsername;

    @Column(name = "smtp_password_encrypted", columnDefinition = "TEXT")
    private String smtpPasswordEncrypted;

    @Column(name = "from_email", nullable = false, length = 320)
    private String fromEmail;

    @Column(name = "starttls_enabled", nullable = false)
    @Builder.Default
    private boolean starttlsEnabled = true;

    @Column(name = "smtp_ssl", nullable = false)
    @Builder.Default
    private boolean smtpSsl = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;
}
