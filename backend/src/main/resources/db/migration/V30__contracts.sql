-- Contract management: AI config per tenant, contracts, parties, revisions, signed files, send log

CREATE TABLE tenant_contract_ai_config (
    tenant_id                 UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    openai_api_key_encrypted  TEXT,
    default_system_prompt     TEXT,
    default_model             VARCHAR(100),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ
);

CREATE TABLE contracts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
    title       VARCHAR(500) NOT NULL,
    status      VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ,
    CONSTRAINT chk_contract_status CHECK (status IN ('draft', 'review', 'sent', 'signed', 'archived'))
);

CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX idx_contracts_tenant_status ON contracts(tenant_id, status);
CREATE INDEX idx_contracts_project ON contracts(tenant_id, project_id);

CREATE TABLE contract_parties (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contract_id  UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    party_kind   VARCHAR(20) NOT NULL,
    client_id    UUID REFERENCES clients(id),
    vendor_id    UUID REFERENCES vendors(id),
    display_name VARCHAR(255),
    contact_email VARCHAR(320),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ,
    CONSTRAINT chk_contract_party_kind CHECK (party_kind IN ('FIRM', 'CLIENT', 'VENDOR')),
    CONSTRAINT chk_contract_party_fk CHECK (
        (party_kind = 'FIRM' AND client_id IS NULL AND vendor_id IS NULL)
        OR (party_kind = 'CLIENT' AND client_id IS NOT NULL AND vendor_id IS NULL)
        OR (party_kind = 'VENDOR' AND vendor_id IS NOT NULL AND client_id IS NULL)
    )
);

CREATE INDEX idx_contract_parties_contract ON contract_parties(contract_id) WHERE deleted_at IS NULL;

CREATE TABLE contract_revisions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contract_id             UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    revision_number         INT NOT NULL,
    body                    TEXT NOT NULL,
    source                  VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    user_prompt             TEXT,
    model                   VARCHAR(100),
    system_prompt_snapshot  TEXT,
    created_by              UUID REFERENCES users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ,
    deleted_at              TIMESTAMPTZ,
    CONSTRAINT uq_contract_revision UNIQUE (contract_id, revision_number),
    CONSTRAINT chk_contract_revision_source CHECK (source IN ('LLM', 'MANUAL', 'IMPORT'))
);

CREATE INDEX idx_contract_revisions_contract ON contract_revisions(contract_id);

CREATE TABLE contract_signed_documents (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    revision_id UUID REFERENCES contract_revisions(id) ON DELETE SET NULL,
    file_name   VARCHAR(500) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_contract_signed_contract ON contract_signed_documents(contract_id) WHERE deleted_at IS NULL;

CREATE TABLE contract_send_log (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contract_id      UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    revision_id      UUID REFERENCES contract_revisions(id) ON DELETE SET NULL,
    subject          VARCHAR(500),
    recipient_emails TEXT NOT NULL,
    status           VARCHAR(30) NOT NULL,
    error_message    TEXT,
    sent_by          UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ,
    deleted_at       TIMESTAMPTZ
);

CREATE INDEX idx_contract_send_log_contract ON contract_send_log(contract_id);

-- RBAC: contract.read / contract.write
UPDATE roles
SET permissions_json = '["crm.read","crm.write","crm.delete","vendor.read","vendor.write","vendor.delete","vendor.approve","project.read","project.write","project.delete","finance.read","finance.write","finance.delete","hr.read","hr.write","hr.delete","hr.approve","report.read","contract.read","contract.write"]'
WHERE name = 'TENANT_ADMIN' AND deleted_at IS NULL;

INSERT INTO roles (id, tenant_id, name, is_system_role, permissions_json)
SELECT gen_random_uuid(), t.tenant_id, 'LEGAL', true,
       '["contract.read","contract.write","crm.read","project.read","vendor.read"]'
FROM (SELECT DISTINCT tenant_id FROM roles WHERE deleted_at IS NULL) AS t
WHERE NOT EXISTS (
    SELECT 1 FROM roles r2
    WHERE r2.tenant_id = t.tenant_id AND r2.name = 'LEGAL' AND r2.deleted_at IS NULL
);
