package com.arqops.iam.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "tenants", indexes = {
        @Index(name = "idx_tenant_slug", columnList = "subdomain_slug", unique = true)
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "subdomain_slug", nullable = false, unique = true, length = 50)
    private String subdomainSlug;

    @Column(length = 20)
    private String plan;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "active";

    @Column(length = 20)
    private String gstin;

    @Column(length = 10)
    private String pan;

    private String address;

    @Column(name = "logo_url")
    private String logoUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "settings_json", columnDefinition = "jsonb")
    private Map<String, Object> settings;

    @Column(name = "google_refresh_token_encrypted", columnDefinition = "TEXT")
    private String googleRefreshTokenEncrypted;

    @Column(name = "google_root_folder_id", length = 255)
    private String googleRootFolderId;

    @Column(name = "google_connected_at")
    private Instant googleConnectedAt;

    @Column(name = "google_connected_email", length = 320)
    private String googleConnectedEmail;

    @Column(name = "google_oauth_client_id", length = 512)
    private String googleOauthClientId;

    @Column(name = "google_oauth_client_secret_encrypted", columnDefinition = "TEXT")
    private String googleOauthClientSecretEncrypted;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;
}
