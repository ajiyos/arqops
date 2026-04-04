CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Platform-level tables (no tenant_id)

CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    subdomain_slug  VARCHAR(50)  NOT NULL UNIQUE,
    plan            VARCHAR(20)  DEFAULT 'starter',
    status          VARCHAR(20)  NOT NULL DEFAULT 'active',
    gstin           VARCHAR(20),
    pan             VARCHAR(10),
    address         TEXT,
    logo_url        VARCHAR(500),
    settings_json   JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ
);

CREATE INDEX idx_tenant_status ON tenants(status);
