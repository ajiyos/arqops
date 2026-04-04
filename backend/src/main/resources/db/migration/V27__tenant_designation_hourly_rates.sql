CREATE TABLE tenant_designation_hourly_rates (
    id             UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    tenant_id      UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    designation    VARCHAR(100)   NOT NULL,
    hourly_rate    NUMERIC(12, 2) NOT NULL DEFAULT 0,
    display_order  INT            NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ,
    deleted_at     TIMESTAMPTZ
);

CREATE INDEX idx_tenant_designation_rates_tenant ON tenant_designation_hourly_rates(tenant_id);

CREATE UNIQUE INDEX idx_tenant_designation_rates_unique
    ON tenant_designation_hourly_rates(tenant_id, lower(designation::text))
    WHERE deleted_at IS NULL;

-- Employees must align to a seeded designation after backfill.
UPDATE employees
SET designation = 'General'
WHERE deleted_at IS NULL
  AND (designation IS NULL OR trim(designation) = '');

INSERT INTO tenant_designation_hourly_rates (id, tenant_id, designation, hourly_rate, display_order, created_at)
SELECT uuid_generate_v4(), t.id, defs.designation, defs.hourly_rate, defs.sort_order, now()
FROM tenants t
CROSS JOIN (
    VALUES
        ('General', 0::numeric, 0),
        ('Architect', 2500::numeric, 1),
        ('Engineer', 1800::numeric, 2),
        ('Site Supervisor', 1200::numeric, 3),
        ('Admin', 800::numeric, 4)
) AS defs(designation, hourly_rate, sort_order)
WHERE NOT EXISTS (
    SELECT 1
    FROM tenant_designation_hourly_rates r
    WHERE r.tenant_id = t.id
      AND r.deleted_at IS NULL
);
