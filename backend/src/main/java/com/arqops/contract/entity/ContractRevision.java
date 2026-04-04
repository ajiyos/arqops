package com.arqops.contract.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import com.arqops.contract.model.ContractRevisionSource;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "contract_revisions",
        uniqueConstraints = @UniqueConstraint(name = "uq_contract_revision", columnNames = {"contract_id", "revision_number"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractRevision extends TenantAwareEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Column(name = "revision_number", nullable = false)
    private int revisionNumber;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ContractRevisionSource source = ContractRevisionSource.MANUAL;

    @Column(name = "user_prompt", columnDefinition = "TEXT")
    private String userPrompt;

    @Column(length = 100)
    private String model;

    @Column(name = "system_prompt_snapshot", columnDefinition = "TEXT")
    private String systemPromptSnapshot;

    @Column(name = "created_by")
    private UUID createdBy;
}
