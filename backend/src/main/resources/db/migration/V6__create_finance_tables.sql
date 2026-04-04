CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id       UUID           NOT NULL REFERENCES clients(id),
    project_id      UUID           REFERENCES projects(id),
    invoice_number  VARCHAR(50)    NOT NULL,
    date            DATE           NOT NULL,
    due_date        DATE           NOT NULL,
    line_items_json JSONB,
    sac_code        VARCHAR(10),
    cgst            NUMERIC(15,2)  DEFAULT 0,
    sgst            NUMERIC(15,2)  DEFAULT 0,
    igst            NUMERIC(15,2)  DEFAULT 0,
    total           NUMERIC(15,2)  NOT NULL DEFAULT 0,
    status          VARCHAR(20)    NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_invoice_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoice_tenant_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoice_client ON invoices(tenant_id, client_id);
CREATE UNIQUE INDEX idx_invoice_number ON invoices(tenant_id, invoice_number);

CREATE TABLE payments (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID           NOT NULL REFERENCES invoices(id),
    amount     NUMERIC(15,2)  NOT NULL,
    date       DATE           NOT NULL,
    mode       VARCHAR(30),
    reference  VARCHAR(100),
    notes      TEXT,
    created_at TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_payment_tenant ON payments(tenant_id);
CREATE INDEX idx_payment_invoice ON payments(tenant_id, invoice_id);

CREATE TABLE vendor_bills (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vendor_id     UUID           NOT NULL REFERENCES vendors(id),
    work_order_id UUID           REFERENCES work_orders(id),
    bill_number   VARCHAR(50),
    amount        NUMERIC(15,2)  NOT NULL,
    gst_amount    NUMERIC(15,2)  DEFAULT 0,
    tds_section   VARCHAR(10),
    tds_rate      NUMERIC(5,2),
    tds_amount    NUMERIC(15,2)  DEFAULT 0,
    due_date      DATE,
    status        VARCHAR(20)    NOT NULL DEFAULT 'pending',
    paid_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_vbill_tenant ON vendor_bills(tenant_id);
CREATE INDEX idx_vbill_vendor ON vendor_bills(tenant_id, vendor_id);
CREATE INDEX idx_vbill_status ON vendor_bills(tenant_id, status);

CREATE TABLE expenses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id          UUID           REFERENCES projects(id),
    category            VARCHAR(50)    NOT NULL,
    amount              NUMERIC(15,2)  NOT NULL,
    date                DATE           NOT NULL,
    description         TEXT,
    receipt_storage_key VARCHAR(500),
    created_by          UUID           REFERENCES users(id),
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_expense_tenant ON expenses(tenant_id);
CREATE INDEX idx_expense_project ON expenses(tenant_id, project_id);
