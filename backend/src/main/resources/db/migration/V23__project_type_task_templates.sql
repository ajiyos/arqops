CREATE TABLE project_type_task_templates (
    id            UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    tenant_id     UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_type  VARCHAR(50)    NOT NULL,
    title         VARCHAR(255)   NOT NULL,
    description   TEXT,
    priority      VARCHAR(10)    NOT NULL DEFAULT 'medium',
    status        VARCHAR(20)    NOT NULL DEFAULT 'todo',
    display_order INT            NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_task_tpl_tenant_type ON project_type_task_templates(tenant_id, project_type);
