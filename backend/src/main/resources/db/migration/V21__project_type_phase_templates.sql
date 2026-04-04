CREATE TABLE project_type_phase_templates (
    id             UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    tenant_id      UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_type   VARCHAR(50)    NOT NULL,
    phase_name     VARCHAR(100)   NOT NULL,
    display_order  INT            NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ,
    deleted_at     TIMESTAMPTZ
);

CREATE INDEX idx_phase_tpl_tenant_type ON project_type_phase_templates(tenant_id, project_type);
