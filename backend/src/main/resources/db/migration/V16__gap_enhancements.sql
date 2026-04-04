-- Task comments table
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    task_id UUID NOT NULL REFERENCES tasks(id),
    author_id UUID,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_task_comment_task ON task_comments(tenant_id, task_id);

-- Employee emergency contact and PAN columns
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pan_encrypted VARCHAR(500);

-- Reimbursement-to-finance linkage
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS expense_id UUID REFERENCES expenses(id);
