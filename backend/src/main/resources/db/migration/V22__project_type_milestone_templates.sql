CREATE TABLE project_type_milestone_templates (
    id                UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    tenant_id         UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phase_template_id UUID           NOT NULL REFERENCES project_type_phase_templates(id) ON DELETE CASCADE,
    name              VARCHAR(255)   NOT NULL,
    display_order     INT            NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ,
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_milestone_tpl_phase ON project_type_milestone_templates(phase_template_id);
CREATE INDEX idx_milestone_tpl_tenant ON project_type_milestone_templates(tenant_id);
