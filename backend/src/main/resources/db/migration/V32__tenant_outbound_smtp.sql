CREATE TABLE tenant_outbound_smtp (
    tenant_id               UUID PRIMARY KEY REFERENCES tenants (id) ON DELETE CASCADE,
    smtp_host               VARCHAR(255) NOT NULL,
    smtp_port               INT          NOT NULL DEFAULT 587,
    smtp_username           VARCHAR(512) NOT NULL,
    smtp_password_encrypted TEXT,
    from_email              VARCHAR(320) NOT NULL,
    starttls_enabled        BOOLEAN      NOT NULL DEFAULT TRUE,
    smtp_ssl                BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
