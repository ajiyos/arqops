CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(50)  NOT NULL,
    is_system_role  BOOLEAN      DEFAULT false,
    permissions_json JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_role_tenant ON roles(tenant_id);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'active',
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_user_tenant ON users(tenant_id);
CREATE INDEX idx_user_tenant_status ON users(tenant_id, status);
CREATE INDEX idx_user_email ON users(email) WHERE deleted_at IS NULL;

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token       VARCHAR(500) NOT NULL UNIQUE,
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    revoked     BOOLEAN      DEFAULT false
);

CREATE INDEX idx_refresh_token ON refresh_tokens(token) WHERE revoked = false;
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);

CREATE TABLE audit_logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id      UUID,
    entity_type  VARCHAR(50)  NOT NULL,
    entity_id    UUID,
    action       VARCHAR(20)  NOT NULL,
    changes_json JSONB,
    ip_address   VARCHAR(45),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_entity ON audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(tenant_id, created_at DESC);
