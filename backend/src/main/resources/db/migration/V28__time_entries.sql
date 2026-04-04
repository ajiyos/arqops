CREATE TABLE time_entries (
    id          UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    tenant_id   UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID           NOT NULL REFERENCES employees(id),
    project_id  UUID           REFERENCES projects(id),
    work_date   DATE           NOT NULL,
    hours       NUMERIC(5, 2)  NOT NULL,
    billable    BOOLEAN        NOT NULL DEFAULT false,
    notes       TEXT,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_time_entries_tenant_employee_date ON time_entries(tenant_id, employee_id, work_date);
CREATE INDEX idx_time_entries_tenant_project ON time_entries(tenant_id, project_id)
    WHERE deleted_at IS NULL AND project_id IS NOT NULL;
