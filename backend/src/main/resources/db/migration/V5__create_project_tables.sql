CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id       UUID           REFERENCES clients(id),
    lead_id         UUID           REFERENCES leads(id),
    name            VARCHAR(255)   NOT NULL,
    type            VARCHAR(50),
    location        VARCHAR(255),
    site_address    TEXT,
    start_date      DATE,
    target_end_date DATE,
    value           NUMERIC(15,2),
    status          VARCHAR(20)    NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_project_tenant ON projects(tenant_id);
CREATE INDEX idx_project_tenant_status ON projects(tenant_id, status);
CREATE INDEX idx_project_client ON projects(tenant_id, client_id);

-- Add FK from work_orders to projects now that projects table exists
ALTER TABLE work_orders ADD CONSTRAINT fk_wo_project
    FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE vendor_scorecards ADD CONSTRAINT fk_scorecard_project
    FOREIGN KEY (project_id) REFERENCES projects(id);

CREATE TABLE project_phases (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    display_order INT         DEFAULT 0,
    start_date    DATE,
    end_date      DATE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_phase_tenant ON project_phases(tenant_id);
CREATE INDEX idx_phase_project ON project_phases(tenant_id, project_id);

CREATE TABLE milestones (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phase_id     UUID         NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    target_date  DATE,
    actual_date  DATE,
    status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
    deliverables TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ
);

CREATE INDEX idx_milestone_tenant ON milestones(tenant_id);
CREATE INDEX idx_milestone_phase ON milestones(tenant_id, phase_id);

CREATE TABLE tasks (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id   UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id UUID         REFERENCES milestones(id),
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    assignee_id  UUID         REFERENCES users(id),
    priority     VARCHAR(10)  DEFAULT 'medium',
    status       VARCHAR(20)  NOT NULL DEFAULT 'todo',
    due_date     DATE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ
);

CREATE INDEX idx_task_tenant ON tasks(tenant_id);
CREATE INDEX idx_task_project ON tasks(tenant_id, project_id);
CREATE INDEX idx_task_assignee ON tasks(tenant_id, assignee_id);
CREATE INDEX idx_task_status ON tasks(tenant_id, status);

CREATE TABLE project_documents (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id  UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    folder_path VARCHAR(500),
    file_name   VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    version     INT          DEFAULT 1,
    uploaded_by UUID         REFERENCES users(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_doc_tenant ON project_documents(tenant_id);
CREATE INDEX idx_doc_project ON project_documents(tenant_id, project_id);

CREATE TABLE project_budget_lines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id      UUID           NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category        VARCHAR(100)   NOT NULL,
    budgeted_amount NUMERIC(15,2)  DEFAULT 0,
    actual_amount   NUMERIC(15,2)  DEFAULT 0,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_budget_tenant ON project_budget_lines(tenant_id);
CREATE INDEX idx_budget_project ON project_budget_lines(tenant_id, project_id);

CREATE TABLE resource_assignments (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id),
    role       VARCHAR(50),
    start_date DATE,
    end_date   DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_assignment_tenant ON resource_assignments(tenant_id);
CREATE INDEX idx_assignment_project ON resource_assignments(tenant_id, project_id);
