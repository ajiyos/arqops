CREATE TABLE tenant_sac_codes (
    id            UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    tenant_id     UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code          VARCHAR(10)    NOT NULL,
    description   VARCHAR(255),
    display_order INT            NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_tenant_sac_codes_tenant ON tenant_sac_codes(tenant_id);

CREATE UNIQUE INDEX idx_tenant_sac_codes_tenant_code_active
    ON tenant_sac_codes(tenant_id, code)
    WHERE deleted_at IS NULL;
