package com.arqops.contract.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tenant_contract_ai_config")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantContractAiConfig {

    @Id
    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "openai_api_key_encrypted", columnDefinition = "TEXT")
    private String openaiApiKeyEncrypted;

    @Column(name = "default_system_prompt", columnDefinition = "TEXT")
    private String defaultSystemPrompt;

    @Column(name = "default_model", length = 100)
    private String defaultModel;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;
}
