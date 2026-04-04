CREATE TABLE clients (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    type                VARCHAR(20)  DEFAULT 'company',
    gstin               VARCHAR(20),
    pan                 VARCHAR(10),
    billing_address_json JSONB,
    industry_segment    VARCHAR(100),
    created_by          UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_client_tenant ON clients(tenant_id);
CREATE INDEX idx_client_tenant_name ON clients(tenant_id, name);

CREATE TABLE contacts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id   UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    email       VARCHAR(255),
    phone       VARCHAR(20),
    role        VARCHAR(50),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_contact_tenant ON contacts(tenant_id);
CREATE INDEX idx_contact_client ON contacts(tenant_id, client_id);

CREATE TABLE lead_stages (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          VARCHAR(50) NOT NULL,
    display_order INT         NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_lead_stage_tenant ON lead_stages(tenant_id);

CREATE TABLE leads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id       UUID           REFERENCES clients(id),
    title           VARCHAR(255)   NOT NULL,
    source          VARCHAR(50),
    project_type    VARCHAR(50),
    estimated_value NUMERIC(15,2),
    stage           VARCHAR(50)    NOT NULL DEFAULT 'New',
    stage_id        UUID           REFERENCES lead_stages(id),
    location        VARCHAR(255),
    assigned_to     UUID           REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_lead_tenant ON leads(tenant_id);
CREATE INDEX idx_lead_tenant_stage ON leads(tenant_id, stage);
CREATE INDEX idx_lead_tenant_assigned ON leads(tenant_id, assigned_to);

CREATE TABLE activities (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(30)  NOT NULL,
    entity_id   UUID         NOT NULL,
    type        VARCHAR(30)  NOT NULL,
    description TEXT,
    date        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    assigned_to UUID         REFERENCES users(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_activity_tenant ON activities(tenant_id);
CREATE INDEX idx_activity_entity ON activities(tenant_id, entity_type, entity_id);
