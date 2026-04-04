# Technical Architecture Document

## Product: ArqOps

**Version:** v1.1
**Last Updated:** 2026-03-26
**Reference:** [BRD.md](./BRD.md)

---

## 1. Architecture Philosophy

| Principle | Application |
|-----------|------------|
| **Modular Monolith** | Single deployable Spring Boot application with clean internal module boundaries. No premature microservice splits. |
| **Shared-Schema Multi-Tenancy** | One database, one schema, `tenant_id` column on every tenant-scoped table. Row-Level Security as defense-in-depth. |
| **Infrastructure Simplicity** | Docker Compose on a single DigitalOcean Droplet. No Kubernetes, no service mesh, no API gateway beyond Caddy. |
| **Progressive Scaling** | Start small ($50-80/mo), scale vertically and horizontally (replicas) within the same Droplet architecture up to 1,000 tenants. |
| **Convention over Configuration** | Standard Spring Boot conventions, well-known folder structures, minimal custom frameworks. |

---

## 2. System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ArqOps Platform                          │
│                                                                     │
│  ┌───────────┐    ┌──────────────┐    ┌─────────────────────────┐   │
│  │  Next.js   │◀──│    Caddy      │──▶│   Spring Boot API       │   │
│  │  Frontend  │   │  (TLS/Proxy)  │   │  (Modular Monolith)     │   │
│  └───────────┘    └──────────────┘   │                          │   │
│                                       │  ┌─────┐ ┌──────────┐   │   │
│                                       │  │ CRM │ │ Vendor   │   │   │
│                                       │  └─────┘ └──────────┘   │   │
│                                       │  ┌─────┐ ┌──────────┐   │   │
│                                       │  │ Proj│ │ Finance  │   │   │
│                                       │  └─────┘ └──────────┘   │   │
│                                       │  ┌─────┐ ┌──────────┐   │   │
│                                       │  │ HR  │ │ Reports  │   │   │
│                                       │  └─────┘ └──────────┘   │   │
│                                       │  ┌──────────────────┐   │   │
│                                       │  │ IAM / Tenancy    │   │   │
│                                       │  └──────────────────┘   │   │
│                                       └────────┬──────────────────┘   │
│                                                │                      │
│                                       ┌────────▼─────────┐            │
│                                       │ Worker (optional │            │
│                                       │ profile; future  │            │
│                                       │ async jobs)      │            │
│                                       └──────────────────┘            │
└────────────────────────────────┬───────────────────────┬───────────┘
                                 │                       │
                    ┌────────────▼──────────┐  ┌─────────▼──────────┐
                    │  DO Managed PostgreSQL │  │  Google Drive API  │
                    │  (primary + optional   │  │  (per-tenant OAuth)│
                    │   read replica)        │  │                    │
                    └───────────────────────┘  └────────────────────┘

External Integrations:
  ├── Transactional Email Service (Resend / Postmark)
  ├── Google OAuth 2.0 + Drive API (tenant-provided storage)
  └── (Future) WhatsApp Business API, Payment Gateway
```

---

## 3. Technology Stack Details

### 3.1 Frontend

| Aspect | Choice | Details |
|--------|--------|---------|
| Framework | **Next.js 14+** (App Router) | Server-side rendering for initial load, client-side navigation for SPA feel |
| Language | **TypeScript** (strict mode) | Type safety across components, API calls, and state |
| UI Components | **Shadcn/ui** | Accessible, composable components. Copy-paste model = no vendor lock-in |
| Styling | **Tailwind CSS** | Utility-first, consistent design system, small bundle |
| State Management | **TanStack Query** (React Query) | Server state caching, background refetching, optimistic updates |
| Forms | **React Hook Form + Zod** | Performant forms with schema-based validation |
| Tables | **TanStack Table** | Headless, sortable, filterable, paginated data tables |
| Charts | **Recharts** | Lightweight, React-native charting for dashboards |
| HTTP Client | **Axios** with interceptors | JWT injection, refresh token handling, tenant header injection |
| Date Handling | **date-fns** | Lightweight, tree-shakeable date utilities |

### 3.2 Backend

| Aspect | Choice | Details |
|--------|--------|---------|
| Runtime | **Java 21** (LTS) | Virtual threads (Project Loom) for high-concurrency I/O with low overhead |
| Framework | **Spring Boot 3.3+** | Mature ecosystem, excellent database integration, security framework |
| Build Tool | **Maven** (Maven Wrapper) | Widely understood, reproducible builds with `mvnw` |
| ORM | **Spring Data JPA + Hibernate 6** | Hibernate multi-tenancy filters, criteria queries, migration support |
| Migrations | **Flyway** | Version-controlled, repeatable schema migrations |
| Validation | **Jakarta Bean Validation** (Hibernate Validator) | Declarative input validation |
| Security | **Spring Security** | JWT authentication, method-level authorization, CORS |
| JWT | **jjwt (io.jsonwebtoken)** | Token generation, validation, claim extraction |
| API Documentation | **SpringDoc OpenAPI** | Auto-generated OpenAPI 3.0 spec and Swagger UI |
| Caching | **None (server-side)** in current build | Dashboard, reports, and tenant APIs read **PostgreSQL** directly. Optional future: Spring Cache + Redis with `tenant:{id}:` key prefix. |
| Async Jobs | **Worker profile (placeholder)** | Same JAR, `worker` Spring profile—**no Redis Streams or queue consumers implemented** yet. Future: DB-backed outbox, Redis Streams, or external broker. |
| File Storage | **Google Drive API** (HTTP) | Per-tenant OAuth; resumable uploads; metadata keys store Drive `fileId` |
| Email | **Spring Mail** + external SMTP | Transactional emails via Resend/Postmark SMTP |
| Logging | **SLF4J + Logback** | Structured JSON logging for production, console for dev |
| Testing | **JUnit 5 + Testcontainers** | Integration tests target **PostgreSQL** where used; no Redis Testcontainer in the current dependency set. |

### 3.3 Infrastructure

| Aspect | Choice | Details |
|--------|--------|---------|
| Container Runtime | **Docker 24+** | Industry standard |
| Orchestration | **Docker Compose v2** | Simple multi-container management on single host |
| Reverse Proxy | **Caddy 2.8** | Automatic HTTPS via Let's Encrypt, simple config, HTTP/2 |
| Database (Dev) | **PostgreSQL 16** (Docker) | Full parity with production |
| Database (Prod) | **DO Managed PostgreSQL 16** | Automated backups, maintenance, private networking |
| Object Storage | **N/A (Google Drive)** | Files live in each customer’s Google Drive under an app-created root folder |
| CI/CD | **GitHub Actions** | Build → Test → Push Image → Deploy via SSH |
| Container Registry | **DigitalOcean Container Registry** | Close to Droplet, simple auth |
| Monitoring | **Prometheus + Grafana** (optional, Phase 2) | Initially rely on structured logs and DO monitoring |

---

## 4. Backend Module Architecture

The Spring Boot application is organized as a **modular monolith** with clear package boundaries. Each business module has its own package subtree and communicates with other modules only through well-defined internal service interfaces (not REST calls).

### 4.1 Package Structure

```
com.arqops
├── ArqOpsApplication.java
├── common/                          # Cross-cutting concerns
│   ├── config/                      # Spring configuration classes
│   ├── security/                    # JWT filter, SecurityConfig, UserDetailsService
│   ├── tenancy/                     # TenantContext, TenantFilter, Hibernate filter config
│   ├── audit/                       # AuditLog entity, AuditInterceptor
│   ├── exception/                   # Global exception handler, custom exceptions
│   ├── dto/                         # Shared DTOs (PageResponse, ApiError, etc.)
│   └── storage/                     # Google Drive upload session + download streaming (`FileController`)
│
├── iam/                             # Identity & Access Management
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── entity/                      # Tenant, User, Role, Permission
│   └── dto/
│
├── crm/                             # CRM Module
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── entity/                      # Client, Contact, Lead, Activity
│   └── dto/
│
├── vendor/                          # Vendor Management Module
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── entity/                      # Vendor, WorkOrder, PurchaseOrder
│   └── dto/
│
├── project/                         # Project Management Module
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── entity/                      # Project, Phase, Milestone, Task, ProjectDocument
│   └── dto/
│
├── finance/                         # Finance Management Module
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── entity/                      # Invoice, Payment, VendorBill, Expense
│   └── dto/
│
├── hr/                              # HR Module
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── entity/                      # Employee, Attendance, LeaveRequest, Reimbursement
│   └── dto/
│
├── report/                          # Reports Module
│   ├── controller/
│   ├── service/                     # Report generation services (reads from other modules)
│   └── dto/
│
└── worker/                          # Async Worker (placeholder package)
    ├── config/                      # Worker-specific beans (when implemented)
    └── handler/                     # Future: job handlers (reports, email, bulk import)
```

### 4.2 Module Communication Rules

1. Modules communicate via **injected service interfaces** — never through REST calls within the same process.
2. The `report` module depends on read-only service methods from other modules.
3. The `finance` module reads from `vendor` (for payables linkage) and `project` (for budget tracking).
4. The `project` module reads from `crm` (for opportunity-to-project conversion).
5. No circular dependencies. If needed, extract a shared interface to `common/`.

### 4.3 Worker Process

The worker runs the same Spring Boot application with a different profile (`worker`):

- **Same Docker image**, different entrypoint/profile: `SPRING_PROFILES_ACTIVE=worker`
- **Current build:** profile and Compose service exist as a **placeholder**; web may be disabled per configuration, but **no Redis Stream consumers or queue producers** are wired in code.
- **Planned job types** (when implemented): report generation (large CSV export), email dispatch, bulk imports, scheduled cleanup—via DB outbox, Redis Streams, or another broker.

---

## 5. Multi-Tenancy Implementation

### 5.1 Tenant Resolution

```
HTTP Request
  │
  ▼
┌─────────────────────────────┐
│  TenantFilter (Servlet)     │  Extracts tenant_id from JWT claims
│  Sets TenantContext          │  (ThreadLocal for synchronous, or
│  (before Spring Security)   │   propagated for async)
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Spring Security Filter     │  Validates JWT signature + expiry
│  (JwtAuthenticationFilter)  │  Sets SecurityContext with user + roles
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Controller → Service       │  Business logic uses TenantContext.getCurrentTenantId()
│  → Repository               │  Hibernate @Filter auto-appends WHERE tenant_id = ?
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  PostgreSQL (RLS)           │  Defense-in-depth: RLS policy rejects
│                             │  if app.current_tenant != row tenant_id
└─────────────────────────────┘
```

### 5.2 Hibernate Tenant Filter

Every tenant-scoped entity extends `TenantAwareEntity`:

```java
@MappedSuperclass
@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "tenantId", type = UUID.class))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public abstract class TenantAwareEntity {

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;
}
```

A Hibernate interceptor or `EntityManager` customizer enables the filter on every session:

```java
Session session = entityManager.unwrap(Session.class);
session.enableFilter("tenantFilter").setParameter("tenantId", TenantContext.getCurrentTenantId());
```

### 5.3 PostgreSQL Row-Level Security (Defense-in-Depth)

```sql
-- Applied per tenant-scoped table via Flyway migration
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON clients
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- The application sets this per-connection before queries
SET app.current_tenant = '<tenant-uuid>';
```

RLS acts as a safety net in case the application-layer filter is bypassed due to a bug.

### 5.4 Tenant Context Propagation

| Context | Mechanism |
|---------|-----------|
| Synchronous request | `ThreadLocal<UUID>` in `TenantContext` |
| Async (@Async) | Custom `TaskDecorator` that copies `TenantContext` to child threads |
| Future async job payload | Tenant ID must be serialized into any out-of-request job (when a queue is introduced) |
| Scheduled tasks | Platform-level tasks (no tenant scope) or iterate tenants explicitly |

---

## 6. Data Model

### 6.1 Core Entity Relationship Overview

```
Tenant (1) ──────┬──── (*) User
                 ├──── (*) Role
                 ├──── (*) Client
                 │         ├──── (*) Contact
                 │         └──── (*) Lead/Opportunity
                 │                    └──── (0..1) Project
                 ├──── (*) Vendor
                 │         ├──── (*) WorkOrder ──── (*) PurchaseOrder
                 │         └──── (*) VendorBill
                 ├──── (*) Project
                 │         ├──── (*) Phase
                 │         │        └──── (*) Milestone
                 │         │                   └──── (*) Task
                 │         ├──── (*) ProjectDocument
                 │         ├──── (*) ProjectBudgetLine
                 │         └──── (*) ResourceAssignment
                 ├──── (*) Invoice ──── (*) Payment
                 ├──── (*) Expense
                 ├──── (*) Employee
                 │         ├──── (*) Attendance
                 │         ├──── (*) LeaveRequest
                 │         └──── (*) Reimbursement
                 └──── (*) AuditLog
```

### 6.2 Key Tables

#### Platform Tables (No tenant_id)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `tenants` | id, name, subdomain_slug, plan, status, settings_json, created_at | Firm registration |
| `platform_users` | id, email, password_hash, is_platform_admin | SaaS operator accounts |

#### IAM Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `users` | id, tenant_id, email, password_hash, name, status, last_login_at | Tenant user accounts |
| `roles` | id, tenant_id, name, is_system_role, permissions_json | Roles per tenant |
| `user_roles` | user_id, role_id | Many-to-many join |
| `audit_logs` | id, tenant_id, user_id, entity_type, entity_id, action, changes_json, ip_address, created_at | Immutable audit trail |

#### CRM Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `clients` | id, tenant_id, name, type, gstin, pan, billing_address_json, created_by | Client/company master |
| `contacts` | id, tenant_id, client_id, name, designation, email, phone, role | Client contacts |
| `leads` | id, tenant_id, client_id, title, source, project_type, estimated_value, stage, location, assigned_to | Pipeline opportunities |
| `lead_stages` | id, tenant_id, name, display_order | Configurable pipeline stages |
| `activities` | id, tenant_id, entity_type, entity_id, type, description, date, assigned_to | Calls, meetings, follow-ups |

#### Vendor Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `vendors` | id, tenant_id, name, category, specialty, gstin, pan, bank_details_encrypted, status | Vendor master |
| `work_orders` | id, tenant_id, vendor_id, project_id, scope, value, payment_terms, status, approved_by, approved_at | Contracts |
| `purchase_orders` | id, tenant_id, work_order_id, po_number, line_items_json, gst_amount, total, status | POs |
| `vendor_scorecards` | id, tenant_id, vendor_id, project_id, quality_rating, timeliness_rating, cost_rating, notes | Performance |

#### Project Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `projects` | id, tenant_id, client_id, lead_id, name, type, location, start_date, target_end_date, value, status | Project master |
| `project_phases` | id, tenant_id, project_id, name, display_order, start_date, end_date | Standard phases |
| `milestones` | id, tenant_id, phase_id, name, target_date, actual_date, status, deliverables | Phase milestones |
| `tasks` | id, tenant_id, milestone_id, project_id, title, description, assignee_id, priority, status, due_date | Work items |
| `project_documents` | id, tenant_id, project_id, folder_path, file_name, storage_key, version, uploaded_by | Document metadata |
| `project_budget_lines` | id, tenant_id, project_id, category, budgeted_amount, actual_amount | Budget tracking |
| `resource_assignments` | id, tenant_id, project_id, user_id, role, start_date, end_date | Team allocation |

#### Finance Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `invoices` | id, tenant_id, client_id, project_id, invoice_number, date, due_date, line_items_json, sac_code, cgst, sgst, igst, total, status | Client invoices |
| `payments` | id, tenant_id, invoice_id, amount, date, mode, reference, notes | Payment receipts |
| `vendor_bills` | id, tenant_id, vendor_id, work_order_id, bill_number, amount, gst_amount, tds_section, tds_rate, tds_amount, due_date, status | Vendor invoices |
| `expenses` | id, tenant_id, project_id, category, amount, date, description, receipt_storage_key, created_by | Expense records |

#### HR Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `employees` | id, tenant_id, user_id, employee_code, name, designation, department, date_of_joining, reporting_manager_id, salary_structure_json, status | Employee master |
| `attendance` | id, tenant_id, employee_id, date, status, check_in_time, check_out_time, notes | Daily attendance |
| `leave_types` | id, tenant_id, name, annual_quota, carry_forward_limit | Leave configuration |
| `leave_requests` | id, tenant_id, employee_id, leave_type_id, start_date, end_date, days, reason, status, approved_by | Leave applications |
| `leave_balances` | id, tenant_id, employee_id, leave_type_id, year, balance | Yearly balances |
| `holidays` | id, tenant_id, name, date, type | Holiday calendar |
| `reimbursements` | id, tenant_id, employee_id, category, amount, description, receipt_storage_key, status, approved_by | Claims |

### 6.3 Indexing Strategy

Every tenant-scoped table has:
- Primary key: `id` (UUID, generated)
- Index on `tenant_id`
- Composite indexes for common query patterns: `(tenant_id, status)`, `(tenant_id, created_at)`, `(tenant_id, client_id)`, etc.
- Full-text search indexes (PostgreSQL `tsvector`) on name/title fields for search-heavy tables (clients, vendors, projects).

### 6.4 Soft Deletes

Business entities use soft delete (`deleted_at TIMESTAMP NULL`). Hibernate `@Where` clause excludes soft-deleted rows by default. Hard delete reserved for data purge on tenant cancellation.

---

## 7. API Design

### 7.1 REST API Conventions

| Convention | Standard |
|------------|----------|
| Base path | `/api/v1/{module}/...` |
| Naming | Plural nouns, kebab-case: `/api/v1/crm/clients`, `/api/v1/vendor/work-orders` |
| Methods | GET (list/read), POST (create), PUT (full update), PATCH (partial), DELETE (soft delete) |
| Pagination | `?page=0&size=20&sort=createdAt,desc` → Returns `PageResponse<T>` |
| Filtering | Query params: `?status=active&clientId=uuid` |
| Search | `?q=search+term` for full-text search |
| Response envelope | `{ "data": ..., "meta": { "page", "size", "totalElements", "totalPages" } }` |
| Error response | `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }` |
| Date format | ISO 8601: `2026-03-24T10:30:00+05:30` |
| Currency | Amounts as `BigDecimal` strings: `"125000.50"` |

### 7.2 API Endpoint Overview

#### Authentication
```
POST   /api/v1/auth/login           # Email + password → JWT pair
POST   /api/v1/auth/refresh          # Refresh token → new JWT pair
POST   /api/v1/auth/logout           # Invalidate refresh token
POST   /api/v1/auth/forgot-password  # Trigger password reset email
POST   /api/v1/auth/reset-password   # Set new password with reset token
```

#### Tenant Administration
```
GET    /api/v1/tenant/profile        # Current tenant profile
PUT    /api/v1/tenant/profile        # Update firm profile
GET    /api/v1/tenant/users          # List tenant users
POST   /api/v1/tenant/users          # Invite user
PUT    /api/v1/tenant/users/{id}     # Update user role/status
GET    /api/v1/tenant/roles          # List roles
POST   /api/v1/tenant/roles          # Create custom role
PUT    /api/v1/tenant/roles/{id}     # Update role permissions
```

#### CRM
```
GET    /api/v1/crm/clients           # List clients (paginated, filterable)
POST   /api/v1/crm/clients           # Create client
GET    /api/v1/crm/clients/{id}      # Client detail with contacts, history
PUT    /api/v1/crm/clients/{id}      # Update client
GET    /api/v1/crm/leads             # List leads (filterable by stage, assignee)
POST   /api/v1/crm/leads             # Create lead
PUT    /api/v1/crm/leads/{id}        # Update lead (including stage change)
POST   /api/v1/crm/leads/{id}/convert  # Convert lead → project
GET    /api/v1/crm/activities        # List activities (filterable by entity)
POST   /api/v1/crm/activities        # Log activity
```

#### Vendor Management
```
GET    /api/v1/vendor/vendors        # List vendors
POST   /api/v1/vendor/vendors        # Create vendor
GET    /api/v1/vendor/vendors/{id}   # Vendor detail
PUT    /api/v1/vendor/vendors/{id}   # Update vendor
GET    /api/v1/vendor/work-orders    # List work orders
POST   /api/v1/vendor/work-orders    # Create work order
PUT    /api/v1/vendor/work-orders/{id}            # Update
POST   /api/v1/vendor/work-orders/{id}/approve    # Approve work order
GET    /api/v1/vendor/purchase-orders              # List POs
POST   /api/v1/vendor/purchase-orders              # Create PO
POST   /api/v1/vendor/purchase-orders/{id}/approve # Approve PO
```

#### Project Management
```
GET    /api/v1/project/projects      # List projects
POST   /api/v1/project/projects      # Create project
GET    /api/v1/project/projects/{id} # Project detail (phases, milestones, budget)
PUT    /api/v1/project/projects/{id} # Update project
GET    /api/v1/project/projects/{id}/tasks       # List tasks
POST   /api/v1/project/projects/{id}/tasks       # Create task
PUT    /api/v1/project/tasks/{id}                # Update task
POST   /api/v1/project/projects/{id}/documents   # Upload document
GET    /api/v1/project/projects/{id}/documents   # List documents
GET    /api/v1/project/projects/{id}/budget      # Budget vs actual
```

#### Finance
```
GET    /api/v1/finance/invoices      # List invoices
POST   /api/v1/finance/invoices      # Create invoice
GET    /api/v1/finance/invoices/{id} # Invoice detail
PUT    /api/v1/finance/invoices/{id} # Update invoice
POST   /api/v1/finance/invoices/{id}/payments    # Record payment
GET    /api/v1/finance/vendor-bills  # List vendor bills
POST   /api/v1/finance/vendor-bills  # Record vendor bill
GET    /api/v1/finance/expenses      # List expenses
POST   /api/v1/finance/expenses      # Create expense
```

#### HR
```
GET    /api/v1/hr/employees          # List employees
POST   /api/v1/hr/employees          # Create employee
GET    /api/v1/hr/employees/{id}     # Employee detail
PUT    /api/v1/hr/employees/{id}     # Update employee
POST   /api/v1/hr/attendance         # Mark attendance
GET    /api/v1/hr/attendance         # List attendance (date range, employee)
GET    /api/v1/hr/leave-requests     # List leave requests
POST   /api/v1/hr/leave-requests     # Apply for leave
POST   /api/v1/hr/leave-requests/{id}/approve    # Approve/reject
GET    /api/v1/hr/reimbursements     # List reimbursements
POST   /api/v1/hr/reimbursements     # Submit reimbursement
POST   /api/v1/hr/reimbursements/{id}/approve    # Approve/reject
```

#### Reports
```
GET    /api/v1/reports/crm/pipeline              # CRM pipeline report
GET    /api/v1/reports/crm/conversion            # Conversion rate report
GET    /api/v1/reports/project/status             # Project status overview
GET    /api/v1/reports/project/slippage           # Milestone slippage
GET    /api/v1/reports/vendor/aging               # Vendor payment aging
GET    /api/v1/reports/vendor/performance         # Vendor scorecard summary
GET    /api/v1/reports/finance/receivables        # Receivables aging
GET    /api/v1/reports/finance/payables           # Payables aging
GET    /api/v1/reports/finance/profitability      # Project-level P&L
GET    /api/v1/reports/finance/gst-summary        # GST summary
GET    /api/v1/reports/finance/tds-register       # TDS deduction register
GET    /api/v1/reports/hr/attendance              # Attendance summary
GET    /api/v1/reports/hr/leave                   # Leave utilization
GET    /api/v1/reports/hr/headcount               # Headcount/attrition
GET    /api/v1/reports/dashboard                  # Executive dashboard data
GET    /api/v1/reports/export/{reportType}        # CSV export (async for large datasets)
```

### 7.3 Authentication Flow

```
┌────────┐                      ┌──────────┐                    ┌────────────┐
│ Browser │                      │ Frontend  │                    │  Backend   │
└────┬───┘                      └─────┬────┘                    └─────┬──────┘
     │  Navigate to login              │                               │
     │────────────────────────────────▶│                               │
     │                                 │  POST /api/v1/auth/login      │
     │                                 │  { email, password }          │
     │                                 │──────────────────────────────▶│
     │                                 │                               │ Validate credentials
     │                                 │                               │ Generate JWT (claims:
     │                                 │                               │   sub, tenant_id, roles)
     │                                 │  { accessToken, refreshToken }│
     │                                 │◀──────────────────────────────│
     │                                 │                               │
     │  Store tokens                   │                               │
     │  (httpOnly cookie or memory)    │                               │
     │◀────────────────────────────────│                               │
     │                                 │                               │
     │  API call with Authorization:   │                               │
     │  Bearer <accessToken>           │                               │
     │────────────────────────────────▶│──────────────────────────────▶│
     │                                 │                               │ Verify JWT
     │                                 │                               │ Extract tenant_id
     │                                 │                               │ Set TenantContext
     │                                 │                               │ Execute (tenant-scoped)
     │                                 │  Response                     │
     │                                 │◀──────────────────────────────│
     │  Rendered response              │                               │
     │◀────────────────────────────────│                               │
```

**JWT Claims:**
```json
{
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "roles": ["TENANT_ADMIN"],
  "email": "user@firm.com",
  "iat": 1711267200,
  "exp": 1711270800
}
```

- Access token TTL: 15 minutes
- Refresh token TTL: 7 days (stored in DB, revocable)

---

## 8. Frontend Architecture

### 8.1 App Router Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/                  # Auth layout (no sidebar)
│   │   │   ├── login/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   ├── (dashboard)/             # Authenticated layout (sidebar + header)
│   │   │   ├── layout.tsx           # Sidebar, header, tenant context provider
│   │   │   ├── page.tsx             # Executive dashboard
│   │   │   ├── crm/
│   │   │   │   ├── clients/page.tsx
│   │   │   │   ├── clients/[id]/page.tsx
│   │   │   │   ├── leads/page.tsx
│   │   │   │   └── pipeline/page.tsx    # Kanban view
│   │   │   ├── vendors/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── work-orders/page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/page.tsx        # Project detail tabs
│   │   │   │   └── [id]/tasks/page.tsx  # Task board
│   │   │   ├── finance/
│   │   │   │   ├── invoices/page.tsx
│   │   │   │   ├── payables/page.tsx
│   │   │   │   └── expenses/page.tsx
│   │   │   ├── hr/
│   │   │   │   ├── employees/page.tsx
│   │   │   │   ├── attendance/page.tsx
│   │   │   │   ├── leaves/page.tsx
│   │   │   │   └── reimbursements/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   └── settings/
│   │   │       ├── profile/page.tsx
│   │   │       ├── users/page.tsx
│   │   │       └── roles/page.tsx
│   │   └── layout.tsx               # Root layout
│   ├── components/
│   │   ├── ui/                      # Shadcn/ui components
│   │   ├── layout/                  # Sidebar, Header, Breadcrumbs
│   │   ├── forms/                   # Reusable form components
│   │   └── data-table/              # Generic data table wrapper
│   ├── lib/
│   │   ├── api/                     # Axios instance, API service functions per module
│   │   ├── auth/                    # Auth context, token management
│   │   ├── hooks/                   # Custom hooks (useDebounce, usePermission, etc.)
│   │   └── utils/                   # Formatters (currency, date, GST), validators
│   └── types/                       # TypeScript interfaces matching backend DTOs
├── public/
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 8.2 State Management Strategy

- **Server state:** TanStack Query manages all API data. Automatic caching, background refetch, pagination.
- **Client state:** React Context for tenant context, auth state, and sidebar collapse state. No heavy state library.
- **Form state:** React Hook Form with Zod schemas mirroring backend validation rules.

### 8.3 Permission Enforcement (Frontend)

```typescript
// Permission check component
<PermissionGate permission="finance.invoice.create">
  <Button onClick={createInvoice}>Create Invoice</Button>
</PermissionGate>

// Permission hook
const canApprove = usePermission("vendor.work-order.approve");
```

Permissions come from JWT claims or a dedicated permissions endpoint on login. Frontend checks control UI visibility; backend always re-validates.

---

## 9. Caching Strategy

### 9.1 Current implementation

There is **no Redis** and **no Spring Cache** in the running application: list/detail endpoints, dashboard KPIs, and native SQL reports **query PostgreSQL** on each request. **TanStack Query** on the frontend provides short-lived client-side caching only.

### 9.2 Optional future: Redis + Spring Cache

If Redis is reintroduced for scale, a reasonable layering would be:

| Cache | Key pattern (tenant-scoped) | TTL | Invalidation |
|-------|----------------------------|-----|--------------|
| Tenant config | `tenant:{id}:config` | 5 min | On tenant settings update |
| Role / permission catalog | `tenant:{id}:roles` or similar | 5 min | On role change |
| Dashboard aggregates | `tenant:{id}:dashboard` | 1–2 min | On writes that affect KPIs or TTL expiry |
| Report snapshots | `tenant:{id}:report:{type}:{hash}` | 5 min | TTL expiry |

Use `@Cacheable` / `@CacheEvict` (or domain events) only after re-adding `spring-boot-starter-data-redis` and a safe JSON serializer for cached DTOs.

---

## 10. Async Job Processing

### 10.1 Current state

**No distributed queue is deployed.** Heavy work today runs **synchronously** in the API process (or is not offloaded). The **`worker` Spring profile** and Docker Compose service are reserved for a future consumer process.

### 10.2 Candidate designs (not implemented)

**Option A — Redis Streams:** `XADD` / `XREADGROUP` with tenant id in the payload (matches earlier BRD sketches).  
**Option B — Transactional outbox:** Insert job rows in PostgreSQL; worker polls or uses logical decoding.  
**Option C — Managed queue:** SQS, NATS, or similar if the deployment grows beyond a single host.

### 10.3 Planned job types (when async exists)

| Job Type | Trigger | Processing |
|----------|---------|------------|
| `report-export` | User requests CSV export of large report | Generate CSV, store per product decision (e.g. tenant Drive), notify user |
| `email-send` | Invoice created, leave approved, etc. | Send transactional email via SMTP |
| `bulk-import` | User uploads CSV for client/vendor import | Parse, validate, insert records |
| `scheduled-reminders` | Cron (daily) | Check overdue invoices, upcoming milestones, send alerts |
| `tenant-onboard` | Platform admin creates tenant | Initialize default roles, leave types, pipeline stages |

### 10.4 Failure handling (target)

- Retries with backoff; dead-letter queue or table for poison messages; structured worker logs with tenant id.

---

## 11. File Storage Architecture

### 11.1 Google Drive layout (per tenant)

After OAuth, the backend creates a root folder **ArqOps Files** in the tenant’s Drive. Application uploads use subfolders such as `projects/{projectId}/…` and `finance/expenses`. Database columns (`storage_key`, `receipt_storage_key`) store the Google **file id**.

### 11.2 Upload flow

1. Tenant admin connects Google once: `GET /api/v1/tenant/storage/google/authorization-url` → Google consent → `GET /api/v1/tenant/storage/google/callback` stores an encrypted refresh token and root folder id.
2. Authenticated user calls `POST /api/v1/files/upload-session` with `fileName`, optional `mimeType`, optional `folderPath`.
3. Backend returns a Drive **resumable** session `uploadUrl` and headers; the browser `PUT`s bytes directly to Google.
4. On success, Google returns JSON including `id`; the client sends that id as `storageKey` / `receiptStorageKey` to domain APIs. The backend verifies the file is under the tenant’s root folder before persisting.

### 11.3 Download flow

1. Client calls authenticated streaming endpoints (e.g. `GET /api/v1/project/projects/{projectId}/documents/{docId}/download` or `GET /api/v1/finance/expenses/{id}/receipt/download`) with the tenant JWT.
2. Backend verifies tenancy and that the Drive file is under the tenant root, then streams `alt=media` from Google to the client (no public presigned URL).

---

## 12. Security Architecture

### 12.1 Defense Layers

```
┌─────────────────────────────────────────┐
│  1. Network: DO Firewall                │  Allow only 80, 443 inbound
│     + DB private networking             │  DB accessible only from Droplet VPC
├─────────────────────────────────────────┤
│  2. Transport: TLS (Caddy auto-HTTPS)   │  All traffic encrypted
├─────────────────────────────────────────┤
│  3. Authentication: JWT + Refresh Token │  Short-lived access, revocable refresh
├─────────────────────────────────────────┤
│  4. Authorization: RBAC                 │  Method-level @PreAuthorize checks
├─────────────────────────────────────────┤
│  5. Tenant Isolation: Filter + RLS      │  Double-layer protection
├─────────────────────────────────────────┤
│  6. Input Validation: Bean Validation   │  Reject malformed data early
├─────────────────────────────────────────┤
│  7. Encryption: AES-256 for PII fields  │  Bank details, PAN encrypted at rest
├─────────────────────────────────────────┤
│  8. Audit: Immutable audit log          │  WHO did WHAT, WHEN, from WHERE
├─────────────────────────────────────────┤
│  9. Rate Limiting: Per-tenant quotas    │  NFR; implement at proxy / app / future cache layer
└─────────────────────────────────────────┘
```

### 12.2 Secrets Management

| Secret | Storage | Rotation |
|--------|---------|----------|
| DB credentials | `.env.prod` on Droplet (chmod 600) | Quarterly via DO managed DB rotation |
| JWT signing key | `.env.prod` | Annual rotation with grace period for old key |
| Google OAuth client id/secret | `.env.prod` | Rotate in Google Cloud Console as needed |
| Encryption key (PII fields) | `.env.prod` | Annual (re-encrypt on rotation) |
| SMTP credentials | `.env.prod` | Per provider policy |

---

## 13. Observability

### 13.1 Logging

- **Format:** Structured JSON in production, human-readable console in dev.
- **Fields:** timestamp, level, logger, tenant_id, user_id, request_id, message, exception.
- **Storage:** Docker container logs → Droplet filesystem (Docker log driver: `json-file` with max-size rotation).
- **Access:** `docker compose logs -f backend` for live tailing. Ship to external log service (e.g., Grafana Cloud free tier) for search.

### 13.2 Health Checks

```
GET /actuator/health         # Overall health (e.g. database; no Redis indicator in current build)
GET /actuator/health/liveness  # Container alive check
GET /actuator/health/readiness # Ready to accept traffic
GET /actuator/info             # App version, build time
GET /actuator/prometheus       # Prometheus metrics (optional)
```

### 13.3 Key Metrics

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| API response time (P95) | Spring Boot Micrometer | > 1s |
| Error rate (5xx) | Caddy access logs + Spring | > 1% of requests |
| DB connection pool usage | HikariCP metrics | > 80% |
| JVM heap / GC pressure | Micrometer / JFR | Sustained high old-gen use |
| Disk usage on Droplet | System metrics | > 80% |
| Active tenant count | Application metric | Informational |

### 13.4 Alerting (Phase 2)

Use DigitalOcean Monitoring alerts for Droplet CPU, memory, and disk. Application-level alerts via Grafana Cloud or Uptime Kuma (self-hosted on the same Droplet).

---

## 14. CI/CD Pipeline

### 14.1 Pipeline Stages

```
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌───────────┐    ┌────────┐
│  Push    │───▶│  Build  │───▶│   Test   │───▶│ Push Image│───▶│ Deploy │
│ (GitHub) │    │         │    │          │    │  (DOCR)   │    │ (SSH)  │
└─────────┘    └─────────┘    └──────────┘    └───────────┘    └────────┘
                 │ Backend:     │ Unit tests   │ Tag: git sha   │ SSH into Droplet
                 │  mvn package │ Integration  │ + latest       │ docker compose pull
                 │ Frontend:    │  (Testcontainers)             │ docker compose up -d
                 │  npm build   │ Lint + type check             │ health check verify
```

### 14.2 Deployment Script

```bash
#!/bin/bash
# deploy.sh — executed via SSH from GitHub Actions
cd /opt/arqops
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker system prune -f
# Verify health
sleep 10
curl -sf http://localhost:8080/actuator/health || exit 1
```

### 14.3 Rollback

- Keep previous image tag. Rollback = change image tag in `.env.prod` and `docker compose up -d`.
- Database migrations are forward-only (Flyway). Rollback requires a compensating migration.

---

## 15. Development Environment

### 15.1 Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- Node.js 20+ (for frontend dev outside Docker, optional)
- Java 21 (for backend dev outside Docker, optional)
- Git

### 15.2 Quick Start

```bash
git clone <repo>
cd arqops
docker compose -f docker-compose.dev.yml up
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- PostgreSQL: localhost:5432 (user: architect_user, pass: architect_pass)
- Adminer (DB UI): http://localhost:9090

### 15.3 Development Workflow

- **Frontend:** Hot-reload via Next.js dev server. Source mounted as volume.
- **Backend:** Spring Boot DevTools for hot-reload. Source and Maven cache mounted as volumes.
- **Database:** Flyway migrations run on backend startup. Seed data loaded via `V999__dev_seed.sql`.
- **Worker:** Disabled by default in dev. Enable with `docker compose --profile worker up`.

---

## 16. Production Environment

### 16.1 Droplet Setup

1. Create Droplet (Ubuntu 24.04 LTS) with private networking enabled.
2. Install Docker Engine + Compose plugin.
3. Configure DO Firewall: allow 80, 443 inbound. SSH via DO console or VPN.
4. Create DO Managed PostgreSQL cluster (same VPC).
5. Ensure production `GOOGLE_OAUTH_REDIRECT_URI` matches the callback path `/api/v1/tenant/storage/google/callback` (each tenant registers this URI in their own Google Cloud OAuth client).
6. Clone deployment repo to `/opt/arqops`.
7. Configure `.env.prod` with `GOOGLE_OAUTH_*` redirect URLs, `APP_ENCRYPTION_KEY`, and other secrets (tenant OAuth client IDs/secrets are stored in-app per workspace, not in `.env.prod`).
8. Run `docker compose -f docker-compose.prod.yml up -d`.

### 16.2 Backup Strategy

| Component | Method | Frequency | Retention |
|-----------|--------|-----------|-----------|
| PostgreSQL | DO Managed automatic backups | Daily | 7 days |
| PostgreSQL | Manual backup before major changes | Ad-hoc | 30 days |
| File storage (Google Drive) | Tenant-owned; Google Drive version history / retention | Per Google account | N/A (customer policy) |
| Application Config | Git repository | Every change | Full history |
| Droplet | DO Droplet snapshots | Weekly | 4 weeks |

---

## 17. Scaling Decision Matrix

| Signal | Current Impact | Action |
|--------|---------------|--------|
| API P95 > 1s sustained | Users experience slowness | Add backend replica (Compose `--scale backend=2`) |
| DB CPU > 70% sustained | Query latency increases | Upgrade managed PostgreSQL plan |
| Droplet CPU > 80% sustained | All services affected | Upgrade Droplet to next tier |
| DB connections near limit | Connection errors | Add PgBouncer container for connection pooling |
| Report queries slow (>5s) | Dashboard/reports lag | Add PostgreSQL read replica, route report queries there |
| Sustained high DB CPU on report endpoints | Dashboards slow for all tenants | Read replica, materialized views, or introduce Redis/cache for hot aggregates |
| Per-tenant Drive quota or API limits | Upload/download failures | Surface clear errors; tenant admin reconnects or frees Drive space |
| Tenants > 1,000 | Architecture review needed | Evaluate multi-Droplet (load balancer) or managed container service |
