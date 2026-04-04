# ArqOps — Database ER Diagram

This document reflects the **PostgreSQL schema** defined by Flyway migrations in [`backend/src/main/resources/db/migration`](backend/src/main/resources/db/migration). All tenant-scoped tables include `tenant_id` referencing `tenants(id)` (shown explicitly below).

**Conventions**

- **PK:** Primary key (`id`, UUID).
- **Soft delete:** `deleted_at` on most business tables (filtered in the application layer).
- **Platform table:** `tenants` has no `tenant_id`.

---

## 1. High-level: tenant hub

Every business domain hangs off `tenants`. `users` is the primary actor table for assignments and approvals.

```mermaid
erDiagram
    tenants ||--o{ users : "has"
    tenants ||--o{ roles : "has"
    tenants ||--o{ clients : "has"
    tenants ||--o{ vendors : "has"
    tenants ||--o{ projects : "has"
    tenants ||--o{ employees : "has"
    tenants ||--o{ audit_logs : "audit"

    users ||--o{ user_roles : "has"
    roles ||--o{ user_roles : "has"
    users ||--o{ refresh_tokens : "has"
```

---

## 2. IAM & platform

```mermaid
erDiagram
    tenants {
        uuid id PK
        varchar name
        varchar subdomain_slug UK
        varchar status
        jsonb settings_json
    }

    roles {
        uuid id PK
        uuid tenant_id FK
        varchar name
        jsonb permissions_json
        timestamptz deleted_at
    }

    users {
        uuid id PK
        uuid tenant_id FK
        varchar email
        varchar password_hash
        varchar status
        timestamptz deleted_at
    }

    user_roles {
        uuid user_id PK_FK
        uuid role_id PK_FK
    }

    refresh_tokens {
        uuid id PK
        varchar token UK
        uuid user_id FK
        timestamptz expires_at
        boolean revoked
    }

    audit_logs {
        uuid id PK
        uuid tenant_id FK
        uuid user_id
        varchar entity_type
        uuid entity_id
        varchar action
        jsonb changes_json
        timestamptz created_at
    }

    tenants ||--o{ roles : "tenant_id"
    tenants ||--o{ users : "tenant_id"
    tenants ||--o{ audit_logs : "tenant_id"
    users ||--o{ user_roles : "user_id"
    roles ||--o{ user_roles : "role_id"
    users ||--o{ refresh_tokens : "user_id"
```

---

## 3. CRM

```mermaid
erDiagram
    tenants ||--o{ clients : "tenant_id"
    tenants ||--o{ contacts : "tenant_id"
    tenants ||--o{ lead_stages : "tenant_id"
    tenants ||--o{ leads : "tenant_id"
    tenants ||--o{ activities : "tenant_id"

    clients ||--o{ contacts : "client_id"
    clients ||--o{ leads : "optional"
    lead_stages ||--o{ leads : "stage_id"

    users ||--o{ leads : "assigned_to"
    users ||--o{ activities : "assigned_to"

    clients {
        uuid id PK
        uuid tenant_id FK
        varchar name
        varchar gstin
        timestamptz deleted_at
    }

    contacts {
        uuid id PK
        uuid tenant_id FK
        uuid client_id FK
        varchar name
        varchar email
        timestamptz deleted_at
    }

    lead_stages {
        uuid id PK
        uuid tenant_id FK
        varchar name
        int display_order
        timestamptz deleted_at
    }

    leads {
        uuid id PK
        uuid tenant_id FK
        uuid client_id FK
        uuid stage_id FK
        uuid assigned_to FK
        varchar stage
        numeric estimated_value
        timestamptz deleted_at
    }

    activities {
        uuid id PK
        uuid tenant_id FK
        varchar entity_type
        uuid entity_id
        varchar type
        uuid assigned_to FK
        timestamptz deleted_at
    }
```

---

## 4. Projects (structure, tasks, documents, budget, resources)

```mermaid
erDiagram
    tenants ||--o{ projects : "tenant_id"
    clients ||--o{ projects : "client_id"
    leads ||--o{ projects : "lead_id"

    projects ||--o{ project_phases : "project_id"
    project_phases ||--o{ milestones : "phase_id"
    projects ||--o{ tasks : "project_id"
    milestones ||--o{ tasks : "milestone_id"
    projects ||--o{ project_documents : "project_id"
    projects ||--o{ project_budget_lines : "project_id"
    projects ||--o{ resource_assignments : "project_id"
    tasks ||--o{ task_comments : "task_id"

    users ||--o{ tasks : "assignee_id"
    users ||--o{ project_documents : "uploaded_by"
    users ||--o{ resource_assignments : "user_id"

    projects {
        uuid id PK
        uuid tenant_id FK
        uuid client_id FK
        uuid lead_id FK
        varchar name
        varchar status
        numeric value
        timestamptz deleted_at
    }

    project_phases {
        uuid id PK
        uuid tenant_id FK
        uuid project_id FK
        varchar name
        int display_order
        timestamptz deleted_at
    }

    milestones {
        uuid id PK
        uuid tenant_id FK
        uuid phase_id FK
        varchar name
        date target_date
        date actual_date
        varchar status
        timestamptz deleted_at
    }

    tasks {
        uuid id PK
        uuid tenant_id FK
        uuid project_id FK
        uuid milestone_id FK
        uuid assignee_id FK
        varchar status
        timestamptz deleted_at
    }

    task_comments {
        uuid id PK
        uuid tenant_id FK
        uuid task_id FK
        uuid author_id
        text content
        timestamptz deleted_at
    }

    project_documents {
        uuid id PK
        uuid tenant_id FK
        uuid project_id FK
        varchar storage_key
        varchar file_name
        int version
        uuid uploaded_by FK
        timestamptz deleted_at
    }

    project_budget_lines {
        uuid id PK
        uuid tenant_id FK
        uuid project_id FK
        varchar category
        numeric budgeted_amount
        numeric actual_amount
        timestamptz deleted_at
    }

    resource_assignments {
        uuid id PK
        uuid tenant_id FK
        uuid project_id FK
        uuid user_id FK
        varchar role
        date start_date
        date end_date
        timestamptz deleted_at
    }
```

---

## 5. Vendors, work orders, POs, scorecards

`work_orders.project_id` and `vendor_scorecards.project_id` reference `projects` (added in migration V5).

```mermaid
erDiagram
    tenants ||--o{ vendors : "tenant_id"
    tenants ||--o{ work_orders : "tenant_id"
    tenants ||--o{ purchase_orders : "tenant_id"
    tenants ||--o{ vendor_scorecards : "tenant_id"

    vendors ||--o{ work_orders : "vendor_id"
    vendors ||--o{ vendor_bills : "vendor_id"
    vendors ||--o{ vendor_scorecards : "vendor_id"

    projects ||--o{ work_orders : "project_id"
    projects ||--o{ vendor_scorecards : "project_id"

    work_orders ||--o{ purchase_orders : "work_order_id"
    work_orders ||--o{ vendor_bills : "work_order_id"

    users ||--o{ work_orders : "approved_by"
    users ||--o{ purchase_orders : "approved_by"

    vendors {
        uuid id PK
        uuid tenant_id FK
        varchar name
        varchar status
        text bank_details_encrypted
        timestamptz deleted_at
    }

    work_orders {
        uuid id PK
        uuid tenant_id FK
        uuid vendor_id FK
        uuid project_id FK
        varchar wo_number
        numeric value
        varchar status
        uuid approved_by FK
        timestamptz deleted_at
    }

    purchase_orders {
        uuid id PK
        uuid tenant_id FK
        uuid work_order_id FK
        varchar po_number
        jsonb line_items_json
        numeric total
        varchar status
        uuid approved_by FK
        timestamptz deleted_at
    }

    vendor_scorecards {
        uuid id PK
        uuid tenant_id FK
        uuid vendor_id FK
        uuid project_id FK
        int quality_rating
        int timeliness_rating
        int cost_rating
        timestamptz deleted_at
    }
```

---

## 6. Finance (invoices, payments, vendor bills, expenses)

```mermaid
erDiagram
    tenants ||--o{ invoices : "tenant_id"
    tenants ||--o{ payments : "tenant_id"
    tenants ||--o{ vendor_bills : "tenant_id"
    tenants ||--o{ expenses : "tenant_id"

    clients ||--o{ invoices : "client_id"
    projects ||--o{ invoices : "project_id"
    invoices ||--o{ payments : "invoice_id"

    vendors ||--o{ vendor_bills : "vendor_id"
    work_orders ||--o{ vendor_bills : "work_order_id"

    projects ||--o{ expenses : "project_id"
    users ||--o{ expenses : "created_by"

    expenses ||--o{ reimbursements : "expense_id"

    invoices {
        uuid id PK
        uuid tenant_id FK
        uuid client_id FK
        uuid project_id FK
        varchar invoice_number
        date date
        date due_date
        jsonb line_items_json
        numeric cgst
        numeric sgst
        numeric igst
        numeric total
        varchar status
        timestamptz deleted_at
    }

    payments {
        uuid id PK
        uuid tenant_id FK
        uuid invoice_id FK
        numeric amount
        date date
        varchar mode
        timestamptz deleted_at
    }

    vendor_bills {
        uuid id PK
        uuid tenant_id FK
        uuid vendor_id FK
        uuid work_order_id FK
        varchar bill_number
        numeric amount
        numeric gst_amount
        varchar tds_section
        numeric tds_rate
        numeric tds_amount
        varchar status
        timestamptz deleted_at
    }

    expenses {
        uuid id PK
        uuid tenant_id FK
        uuid project_id FK
        varchar category
        numeric amount
        date date
        uuid created_by FK
        timestamptz deleted_at
    }
```

---

## 7. HR

```mermaid
erDiagram
    tenants ||--o{ employees : "tenant_id"
    tenants ||--o{ attendance : "tenant_id"
    tenants ||--o{ leave_types : "tenant_id"
    tenants ||--o{ leave_requests : "tenant_id"
    tenants ||--o{ leave_balances : "tenant_id"
    tenants ||--o{ holidays : "tenant_id"
    tenants ||--o{ reimbursements : "tenant_id"

    users ||--o{ employees : "user_id"
    employees ||--o{ employees : "reporting_manager_id"

    employees ||--o{ attendance : "employee_id"
    employees ||--o{ leave_requests : "employee_id"
    employees ||--o{ leave_balances : "employee_id"
    employees ||--o{ reimbursements : "employee_id"

    leave_types ||--o{ leave_requests : "leave_type_id"
    leave_types ||--o{ leave_balances : "leave_type_id"

    users ||--o{ leave_requests : "approved_by"
    users ||--o{ reimbursements : "approved_by"

    expenses ||--o{ reimbursements : "expense_id"

    employees {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        uuid reporting_manager_id FK
        varchar employee_code
        varchar name
        jsonb salary_structure_json
        varchar pan_encrypted
        varchar status
        timestamptz deleted_at
    }

    attendance {
        uuid id PK
        uuid tenant_id FK
        uuid employee_id FK
        date date
        varchar status
        timestamptz deleted_at
    }

    leave_types {
        uuid id PK
        uuid tenant_id FK
        varchar name
        int annual_quota
        timestamptz deleted_at
    }

    leave_requests {
        uuid id PK
        uuid tenant_id FK
        uuid employee_id FK
        uuid leave_type_id FK
        uuid approved_by FK
        date start_date
        date end_date
        varchar status
        timestamptz deleted_at
    }

    leave_balances {
        uuid id PK
        uuid tenant_id FK
        uuid employee_id FK
        uuid leave_type_id FK
        int year
        numeric balance
        timestamptz deleted_at
    }

    holidays {
        uuid id PK
        uuid tenant_id FK
        varchar name
        date date
        varchar type
        timestamptz deleted_at
    }

    reimbursements {
        uuid id PK
        uuid tenant_id FK
        uuid employee_id FK
        uuid expense_id FK
        numeric amount
        varchar status
        uuid approved_by FK
        timestamptz deleted_at
    }
```

---

## 8. Cross-domain links (reference)

| From | To | Purpose |
|------|-----|---------|
| `projects` | `clients`, `leads` | Project origin from CRM |
| `work_orders` | `projects`, `vendors` | Vendor work on a site |
| `invoices` | `clients`, `projects` | Billing |
| `expenses` | `projects`, `users` | Cost and overhead |
| `reimbursements` | `expenses` | Approved reimbursement → finance expense (V16) |
| `employees` | `users` | Link HR record to login |
| `employees` | `employees` | Reporting hierarchy |

---

## 9. Entity count

| Area | Tables |
|------|--------|
| Platform / IAM | `tenants`, `roles`, `users`, `user_roles`, `refresh_tokens`, `audit_logs` |
| CRM | `clients`, `contacts`, `lead_stages`, `leads`, `activities` |
| Vendor | `vendors`, `work_orders`, `purchase_orders`, `vendor_scorecards` |
| Project | `projects`, `project_phases`, `milestones`, `tasks`, `task_comments`, `project_documents`, `project_budget_lines`, `resource_assignments` |
| Finance | `invoices`, `payments`, `vendor_bills`, `expenses` |
| HR | `employees`, `attendance`, `leave_types`, `leave_requests`, `leave_balances`, `holidays`, `reimbursements` |

**Total: 32 tables** (including `task_comments` and columns added in V16+).

---

*Render Mermaid diagrams in GitHub, GitLab, VS Code (Mermaid Preview), or export to PNG/SVG using [mermaid-cli](https://github.com/mermaid-js/mermaid-cli) if needed.*
