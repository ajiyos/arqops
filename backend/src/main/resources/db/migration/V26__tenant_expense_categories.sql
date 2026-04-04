CREATE TABLE tenant_expense_categories (
    id            UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    tenant_id     UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          VARCHAR(50)    NOT NULL,
    display_order INT            NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_tenant_expense_categories_tenant ON tenant_expense_categories(tenant_id);

CREATE UNIQUE INDEX idx_tenant_expense_categories_tenant_name
    ON tenant_expense_categories(tenant_id, lower(name::text))
    WHERE deleted_at IS NULL;

INSERT INTO tenant_expense_categories (id, tenant_id, name, display_order, created_at)
SELECT uuid_generate_v4(), t.id, defs.name, defs.sort_order, now()
FROM tenants t
CROSS JOIN (
    VALUES
        ('Site Visits', 0),
        ('Travel', 1),
        ('Materials', 2),
        ('Printing', 3),
        ('Consultancy', 4),
        ('Office Supplies', 5),
        ('Software & Subscriptions', 6),
        ('Meals & Entertainment', 7),
        ('Other', 8)
) AS defs(name, sort_order)
WHERE NOT EXISTS (
    SELECT 1
    FROM tenant_expense_categories c
    WHERE c.tenant_id = t.id
      AND c.deleted_at IS NULL
);
