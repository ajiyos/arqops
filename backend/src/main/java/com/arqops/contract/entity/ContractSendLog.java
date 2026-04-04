package com.arqops.contract.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "contract_send_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractSendLog extends TenantAwareEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "revision_id")
    private ContractRevision revision;

    @Column(length = 500)
    private String subject;

    @Column(name = "recipient_emails", nullable = false, columnDefinition = "TEXT")
    private String recipientEmails;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "sent_by")
    private UUID sentBy;
}
