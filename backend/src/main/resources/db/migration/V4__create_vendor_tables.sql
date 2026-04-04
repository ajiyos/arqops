CREATE TABLE vendors (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                    VARCHAR(255) NOT NULL,
    category                VARCHAR(50),
    specialty               VARCHAR(100),
    gstin                   VARCHAR(20),
    pan                     VARCHAR(10),
    bank_details_encrypted  TEXT,
    address                 TEXT,
    phone                   VARCHAR(20),
    email                   VARCHAR(255),
    status                  VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ,
    deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_vendor_tenant ON vendors(tenant_id);
CREATE INDEX idx_vendor_tenant_status ON vendors(tenant_id, status);
CREATE INDEX idx_vendor_tenant_name ON vendors(tenant_id, name);

CREATE TABLE work_orders (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vendor_id     UUID           NOT NULL REFERENCES vendors(id),
    project_id    UUID,
    wo_number     VARCHAR(50),
    scope         TEXT,
    value         NUMERIC(15,2),
    payment_terms TEXT,
    start_date    DATE,
    end_date      DATE,
    status        VARCHAR(20)    NOT NULL DEFAULT 'draft',
    approved_by   UUID           REFERENCES users(id),
    approved_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_wo_tenant ON work_orders(tenant_id);
CREATE INDEX idx_wo_vendor ON work_orders(tenant_id, vendor_id);
CREATE INDEX idx_wo_project ON work_orders(tenant_id, project_id);

CREATE TABLE purchase_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id   UUID           REFERENCES work_orders(id),
    po_number       VARCHAR(50),
    line_items_json JSONB,
    gst_amount      NUMERIC(15,2)  DEFAULT 0,
    total           NUMERIC(15,2)  NOT NULL DEFAULT 0,
    status          VARCHAR(20)    NOT NULL DEFAULT 'draft',
    approved_by     UUID           REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_po_tenant ON purchase_orders(tenant_id);
CREATE INDEX idx_po_wo ON purchase_orders(tenant_id, work_order_id);

CREATE TABLE vendor_scorecards (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vendor_id         UUID        NOT NULL REFERENCES vendors(id),
    project_id        UUID,
    quality_rating    INT,
    timeliness_rating INT,
    cost_rating       INT,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ,
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_scorecard_tenant ON vendor_scorecards(tenant_id);
CREATE INDEX idx_scorecard_vendor ON vendor_scorecards(tenant_id, vendor_id);
