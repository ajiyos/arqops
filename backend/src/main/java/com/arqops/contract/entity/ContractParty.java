package com.arqops.contract.entity;

import com.arqops.common.tenancy.TenantAwareEntity;
import com.arqops.contract.model.ContractPartyKind;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.util.UUID;

@Entity
@Table(name = "contract_parties")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractParty extends TenantAwareEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Enumerated(EnumType.STRING)
    @Column(name = "party_kind", nullable = false, length = 20)
    private ContractPartyKind partyKind;

    @Column(name = "client_id")
    private UUID clientId;

    @Column(name = "vendor_id")
    private UUID vendorId;

    @Column(name = "display_name", length = 255)
    private String displayName;

    @Column(name = "contact_email", length = 320)
    private String contactEmail;
}
