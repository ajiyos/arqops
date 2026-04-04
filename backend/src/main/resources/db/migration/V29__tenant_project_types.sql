CREATE TABLE tenant_project_types (
    id             UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    tenant_id      UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name           VARCHAR(100)   NOT NULL,
    display_order  INT            NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ,
    deleted_at     TIMESTAMPTZ
);

CREATE INDEX idx_tenant_project_types_tenant ON tenant_project_types(tenant_id);

CREATE UNIQUE INDEX idx_tenant_project_types_unique
    ON tenant_project_types(tenant_id, lower(name::text))
    WHERE deleted_at IS NULL;

INSERT INTO tenant_project_types (id, tenant_id, name, display_order, created_at)
SELECT uuid_generate_v4(), t.id, defs.name, defs.sort_order, now()
FROM tenants t
CROSS JOIN (
    VALUES
        ('Residential', 0),
        ('Commercial', 1),
        ('Interior', 2),
        ('Landscape', 3)
) AS defs(name, sort_order)
WHERE NOT EXISTS (
    SELECT 1
    FROM tenant_project_types p
    WHERE p.tenant_id = t.id
      AND p.deleted_at IS NULL
);
