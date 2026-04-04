CREATE TABLE employees (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id             UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id               UUID         REFERENCES users(id),
    employee_code         VARCHAR(20),
    name                  VARCHAR(255) NOT NULL,
    designation           VARCHAR(100),
    department            VARCHAR(100),
    date_of_joining       DATE,
    reporting_manager_id  UUID         REFERENCES employees(id),
    salary_structure_json JSONB,
    phone                 VARCHAR(20),
    personal_email        VARCHAR(255),
    status                VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ,
    deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_employee_tenant ON employees(tenant_id);
CREATE INDEX idx_employee_tenant_status ON employees(tenant_id, status);

CREATE TABLE attendance (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id    UUID        NOT NULL REFERENCES employees(id),
    date           DATE        NOT NULL,
    status         VARCHAR(20) NOT NULL,
    check_in_time  TIME,
    check_out_time TIME,
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ,
    deleted_at     TIMESTAMPTZ,
    UNIQUE(tenant_id, employee_id, date)
);

CREATE INDEX idx_attendance_tenant ON attendance(tenant_id);
CREATE INDEX idx_attendance_employee ON attendance(tenant_id, employee_id, date);

CREATE TABLE leave_types (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(50) NOT NULL,
    annual_quota        INT         DEFAULT 0,
    carry_forward_limit INT         DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_leave_type_tenant ON leave_types(tenant_id);

CREATE TABLE leave_requests (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id   UUID         NOT NULL REFERENCES employees(id),
    leave_type_id UUID         NOT NULL REFERENCES leave_types(id),
    start_date    DATE         NOT NULL,
    end_date      DATE         NOT NULL,
    days          NUMERIC(4,1) NOT NULL,
    reason        TEXT,
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
    approved_by   UUID         REFERENCES users(id),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_leave_tenant ON leave_requests(tenant_id);
CREATE INDEX idx_leave_employee ON leave_requests(tenant_id, employee_id);
CREATE INDEX idx_leave_status ON leave_requests(tenant_id, status);

CREATE TABLE leave_balances (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id   UUID NOT NULL REFERENCES employees(id),
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    year          INT  NOT NULL,
    balance       NUMERIC(5,1) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ,
    UNIQUE(tenant_id, employee_id, leave_type_id, year)
);

CREATE INDEX idx_leave_bal_tenant ON leave_balances(tenant_id);

CREATE TABLE holidays (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name      VARCHAR(100) NOT NULL,
    date      DATE         NOT NULL,
    type      VARCHAR(30)  DEFAULT 'national',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_holiday_tenant ON holidays(tenant_id);

CREATE TABLE reimbursements (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id         UUID           NOT NULL REFERENCES employees(id),
    category            VARCHAR(50)    NOT NULL,
    amount              NUMERIC(15,2)  NOT NULL,
    description         TEXT,
    receipt_storage_key VARCHAR(500),
    status              VARCHAR(20)    NOT NULL DEFAULT 'pending',
    approved_by         UUID           REFERENCES users(id),
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_reimburse_tenant ON reimbursements(tenant_id);
CREATE INDEX idx_reimburse_employee ON reimbursements(tenant_id, employee_id);
