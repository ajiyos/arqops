# Business Requirements Document (BRD)

## Product: ArqOps

Multi-tenant SaaS backoffice platform for Indian architecture firms.

**Version:** v1.0
**Last Updated:** 2026-03-24
**Cloud Target:** DigitalOcean (single Droplet hosting strategy)

---

## 1. Executive Summary

Indian architecture firms — from boutique studios to mid-size practices — commonly run CRM, project tracking, vendor handling, finance operations, and HR on disconnected spreadsheets, WhatsApp groups, and ad-hoc tools. This results in lost leads, missed deadlines, delayed vendor payments, opaque project finances, and compliance headaches around GST/TDS.

**ArqOps** unifies these workflows in a single multi-tenant SaaS platform purpose-built for Indian architect firms. It provides strong tenant isolation, role-based access, and India-relevant data fields (GST, TDS, PAN, SAC codes) out of the box.

### Design Principles

- **Start lean:** Launch on a single DigitalOcean Droplet with minimal monthly cost (~$50-80/month infrastructure).
- **Scale proportionally:** Grow infrastructure spend in step with tenant count and usage — vertical scaling, caching, async workers, managed DB tier upgrades, and optional app replicas on the same Droplet.
- **Stay simple:** Modular monolith architecture with minimum microservices. One codebase, one deployment unit (+ optional async worker from the same image).
- **India-first:** GST-aware invoicing fields, TDS metadata tracking, INR as default currency, Indian date/number formats, IST timezone handling.

---

## 2. Business Goals

| # | Goal | Success Metric |
|---|------|---------------|
| BG-1 | Reduce administrative overhead for tenant firms | 30-50% time reduction in back-office tasks within 6 months of adoption |
| BG-2 | Improve lead-to-project conversion visibility | Measurable pipeline analytics; 20% improvement in conversion tracking accuracy |
| BG-3 | Improve project delivery discipline | Milestone slippage tracked and reduced by 15% |
| BG-4 | Vendor payment transparency | Zero missed payment due dates; full payable aging visibility |
| BG-5 | Financial clarity for firm owners | Real-time project profitability, receivables/payables dashboards |
| BG-6 | Centralized HR operations | Single source of truth for attendance, leave, employee records |
| BG-7 | Proportional infrastructure economics | Infra cost per tenant decreases as tenant count grows; no per-tenant provisioning |

---

## 3. Stakeholders and Personas

### 3.1 Tenant-Side Personas

| Persona | Role | Primary Modules | Key Needs |
|---------|------|----------------|-----------|
| **Firm Owner / Partner** | Tenant Admin | All modules, Dashboards | Bird's-eye view of firm health, financials, project status |
| **Project Lead / Senior Architect** | Project Manager | Project Mgmt, CRM | Milestone tracking, resource allocation, client communication |
| **Finance Manager / Accountant** | Finance User | Finance, Vendor Mgmt, Reports | Invoice generation, payment tracking, GST/TDS compliance data |
| **HR / Office Admin** | HR User | HR, Reports | Employee records, attendance, leave, reimbursements |
| **Junior Architect / Staff** | Team Member | Project Mgmt (limited) | Task updates, timesheet (future), document access |
| **Vendor Contact** | External User | Vendor Portal (limited) | PO status, payment status, document upload |

### 3.2 Platform-Side Personas

| Persona | Role | Access |
|---------|------|--------|
| **Platform Admin** | SaaS Ops | Tenant provisioning, platform config, system health monitoring |
| **Platform Support** | Support Agent | Tenant-scoped read access for troubleshooting |

---

## 4. Scope

### 4.1 In Scope (Phase 1 — MVP)

| Module | Description |
|--------|-------------|
| **Multi-Tenant IAM** | Authentication, RBAC, tenant isolation, audit logging |
| **CRM** | Client management, leads/pipeline, activities, proposal linkage |
| **Vendor Management** | Vendor master, contracts, POs, payment tracking, scorecards |
| **Project Management** | Projects, milestones, tasks, documents, budget tracking |
| **Finance Management** | Invoices, receivables, payables, expenses, GST/TDS fields |
| **HR** | Employee directory, attendance, leave, payroll metadata, reimbursements |
| **Reports & Dashboards** | Module-specific reports, executive dashboards, CSV export |

### 4.2 Out of Scope (Phase 1)

- Native mobile applications (responsive web only for MVP)
- Full payroll disbursement and salary processing
- Full statutory filing automation (GST return filing, TDS return filing)
- CAD/BIM file editing or rendering inside the application
- WhatsApp/SMS integration for notifications (email only for MVP)
- Multi-currency support (INR only for MVP)
- Time tracking / timesheets (Phase 2)
- Client-facing portal (Phase 2)

---

## 5. Functional Requirements

### 5.1 Multi-Tenant IAM Module

#### 5.1.1 Tenant Management
- FR-IAM-01: Platform admin can create/onboard a new tenant (firm) with firm name, subdomain slug, admin email, and plan tier.
- FR-IAM-02: Each tenant gets an isolated namespace; all tenant data is scoped by `tenant_id`.
- FR-IAM-03: Tenant admin can configure firm profile: logo, address, GSTIN, PAN, SAC codes, bank details.
- FR-IAM-04: Tenant admin can manage subscription status (active, suspended, cancelled) — controlled by platform.

#### 5.1.2 Authentication & Authorization
- FR-IAM-05: Email + password authentication with bcrypt hashing.
- FR-IAM-06: JWT-based session tokens with configurable expiry.
- FR-IAM-07: Role-based access control (RBAC) with predefined roles: Tenant Admin, Project Lead, Finance Manager, HR Admin, Staff, Vendor (external).
- FR-IAM-08: Tenant admin can create custom roles with granular permissions per module and action (view, create, edit, delete, approve).
- FR-IAM-09: All API endpoints enforce tenant isolation and role permissions.

#### 5.1.3 Audit Logging
- FR-IAM-10: Every create, update, delete, and approval action is logged with: actor, tenant, entity, action, timestamp, IP address.
- FR-IAM-11: Audit logs are immutable and queryable by tenant admin for their own tenant.

---

### 5.2 CRM Module

#### 5.2.1 Client Management
- FR-CRM-01: Create/edit client accounts with: name, type (individual/company), GSTIN, PAN, addresses (billing/site), industry segment.
- FR-CRM-02: Manage multiple contacts per client with: name, designation, email, phone, role (decision maker, technical, accounts).
- FR-CRM-03: View client history: all linked leads, projects, invoices, communications.

#### 5.2.2 Lead & Opportunity Pipeline
- FR-CRM-04: Create leads with: source, client link, project type (residential, commercial, interior, landscape, institutional), estimated value, location.
- FR-CRM-05: Configurable pipeline stages per tenant (default: New → Qualified → Proposal Sent → Negotiation → Won → Lost).
- FR-CRM-06: Drag-and-drop Kanban view for pipeline management.
- FR-CRM-07: Attach proposal documents and fee estimates to opportunities.
- FR-CRM-08: Convert won opportunity to project (auto-populate project fields from lead data).

#### 5.2.3 Activities & Follow-ups
- FR-CRM-09: Log activities: calls, meetings, emails, site visits, with date/time/notes/assignee.
- FR-CRM-10: Create follow-up tasks with due dates and reminders.
- FR-CRM-11: Activity timeline view per client and per lead.

---

### 5.3 Vendor Management Module

#### 5.3.1 Vendor Master
- FR-VND-01: Create/edit vendor with: name, category (contractor, supplier, consultant, sub-consultant), trade/specialty, GSTIN, PAN, addresses, bank details (encrypted at rest).
- FR-VND-02: Vendor categorization and tagging for search/filter.
- FR-VND-03: Vendor document storage: registration certificates, insurance, past work samples.

#### 5.3.2 Contracts & Work Orders
- FR-VND-04: Create work orders linked to a vendor and a project, with: scope of work, value, payment terms, start/end dates.
- FR-VND-05: Multi-level approval workflow for work orders (configurable: single approver or two-level).
- FR-VND-06: Track work order amendments and version history.

#### 5.3.3 Purchase Orders
- FR-VND-07: Generate POs against work orders with line items, quantities, rates, and tax (GST) computation fields.
- FR-VND-08: PO approval workflow.
- FR-VND-09: Track PO delivery status and link to vendor invoices.

#### 5.3.4 Vendor Payments & Performance
- FR-VND-10: Track vendor invoices and payment schedules against work orders.
- FR-VND-11: Payment aging report per vendor.
- FR-VND-12: Vendor performance notes / scorecards (quality, timeliness, cost adherence — simple 1-5 rating per project).

#### 5.3.5 Vendor Portal (Lightweight)
- FR-VND-13: Optional vendor login with limited access: view their POs, payment status, upload invoices/documents.

---

### 5.4 Project Management Module

#### 5.4.1 Project Setup
- FR-PRJ-01: Create project from CRM opportunity conversion or manually.
- FR-PRJ-02: Project fields: name, client, type, location, site address, start/target end date, project value, status.
- FR-PRJ-03: Define project phases (default for architecture: Concept → Schematic Design → Design Development → Construction Documents → Construction Administration → Closeout).

#### 5.4.2 Milestones & Tasks
- FR-PRJ-04: Create milestones within phases with target dates and deliverables.
- FR-PRJ-05: Create tasks under milestones with: assignee, priority, status (To Do, In Progress, Review, Done), due date.
- FR-PRJ-06: Task comments and attachments.
- FR-PRJ-07: Task board (Kanban) and list views.

#### 5.4.3 Documents
- FR-PRJ-08: Project document repository with folder structure.
- FR-PRJ-09: Upload drawings, specifications, reports, correspondence.
- FR-PRJ-10: Version tracking for documents.

#### 5.4.4 Resource Assignment
- FR-PRJ-11: Assign team members to projects with roles.
- FR-PRJ-12: View team member's project load across projects.

#### 5.4.5 Budget Tracking
- FR-PRJ-13: Define project budget with line items by category (design fees, consultant fees, vendor costs, overheads).
- FR-PRJ-14: Track actual costs (from vendor payables + expenses) vs. budget.
- FR-PRJ-15: Budget variance alerts when actuals exceed threshold (e.g., 80%, 100%).

---

### 5.5 Finance Management Module

#### 5.5.1 Client Invoicing & Receivables
- FR-FIN-01: Generate client invoices linked to project milestones or custom line items.
- FR-FIN-02: Invoice fields: invoice number (auto-generated, configurable prefix), date, due date, line items, SAC code, GST rates (CGST+SGST or IGST based on state), total.
- FR-FIN-03: Track invoice status: Draft → Sent → Partially Paid → Paid → Overdue.
- FR-FIN-04: Record payments received against invoices with date, amount, payment mode, reference.
- FR-FIN-05: Receivables aging report (current, 30, 60, 90+ days).

#### 5.5.2 Vendor Payables
- FR-FIN-06: Record vendor invoices/bills linked to work orders/POs.
- FR-FIN-07: Track TDS applicability and deduction metadata per vendor payment (TDS section, rate, amount — for record-keeping, not auto-filing).
- FR-FIN-08: Payment scheduling and approval workflow.
- FR-FIN-09: Payables aging report.

#### 5.5.3 Expense Tracking
- FR-FIN-10: Record expenses by project, cost center, or general overhead.
- FR-FIN-11: Expense categories: travel, printing, courier, site expenses, software subscriptions, utilities, etc.
- FR-FIN-12: Attach receipts/invoices to expense entries.

#### 5.5.4 Financial Dashboards
- FR-FIN-13: Project-level P&L: fees received vs. vendor costs + expenses.
- FR-FIN-14: Firm-level receivables vs. payables summary.
- FR-FIN-15: Monthly revenue and expense trend charts.
- FR-FIN-16: GST summary report: outward supplies (invoices) and inward supplies (vendor bills) with GST breakdowns.

---

### 5.6 HR Module

#### 5.6.1 Employee Directory
- FR-HR-01: Employee master: name, employee ID, designation, department, date of joining, reporting manager, contact info, emergency contact.
- FR-HR-02: Employee document storage: offer letter, ID proof, address proof, PAN card, education certificates.
- FR-HR-03: Employee status management: active, on notice, resigned, terminated.

#### 5.6.2 Attendance & Leave
- FR-HR-04: Daily attendance marking (present, absent, half-day, WFH, on-site) — manual entry or simple check-in.
- FR-HR-05: Leave types: casual leave, sick leave, earned leave, comp-off (configurable per tenant).
- FR-HR-06: Leave application and approval workflow (employee → reporting manager).
- FR-HR-07: Leave balance tracking and annual rollover rules.
- FR-HR-08: Holiday calendar management (national + tenant-specific).

#### 5.6.3 Payroll Metadata
- FR-HR-09: Salary structure definition: basic, HRA, conveyance, special allowance, other components.
- FR-HR-10: Monthly payroll register generation (metadata only — amounts and deductions computed for record-keeping; actual disbursement is out of scope).
- FR-HR-11: Track PF, ESI, PT metadata fields per employee.

#### 5.6.4 Reimbursements
- FR-HR-12: Employee reimbursement claims with category, amount, receipts.
- FR-HR-13: Approval workflow for reimbursements.
- FR-HR-14: Link approved reimbursements to finance for payment tracking.

---

### 5.7 Reports & Dashboards Module

#### 5.7.1 CRM Reports
- FR-RPT-01: Lead pipeline by stage, source, project type.
- FR-RPT-02: Conversion rate and average deal cycle time.
- FR-RPT-03: Activity log summary by team member.

#### 5.7.2 Project Reports
- FR-RPT-04: Active projects overview with status and health indicators.
- FR-RPT-05: Milestone slippage report (planned vs. actual dates).
- FR-RPT-06: Resource utilization across projects.

#### 5.7.3 Vendor Reports
- FR-RPT-07: Vendor payment aging (current, 30, 60, 90+ days).
- FR-RPT-08: Vendor performance summary across projects.
- FR-RPT-09: Work order and PO summary by project.

#### 5.7.4 Finance Reports
- FR-RPT-10: Receivables aging.
- FR-RPT-11: Payables aging.
- FR-RPT-12: Project-level profitability (fees vs. costs).
- FR-RPT-13: Monthly revenue and expense summary.
- FR-RPT-14: GST summary (outward/inward).
- FR-RPT-15: TDS deduction register.

#### 5.7.5 HR Reports
- FR-RPT-16: Attendance summary (monthly/annual per employee).
- FR-RPT-17: Leave balance and utilization report.
- FR-RPT-18: Headcount and attrition report.
- FR-RPT-19: Reimbursement summary.

#### 5.7.6 Executive Dashboard
- FR-RPT-20: Tenant-level dashboard with: active projects count, pipeline value, outstanding receivables, pending payables, team headcount, key alerts.
- FR-RPT-21: All reports exportable to CSV.
- FR-RPT-22: Dashboard date-range filtering and drill-down capability.

---

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | **Multi-Tenancy** | Strict tenant isolation by `tenant_id` at all data-access layers. No cross-tenant data leakage under any circumstance. |
| NFR-02 | **Performance** | P95 API response < 500ms for common reads. Dashboard queries < 2s. |
| NFR-03 | **Availability** | 99.5% uptime target (initial). Improve to 99.9% as architecture matures. |
| NFR-04 | **Security — Transport** | TLS encryption for all client-server communication. HTTPS enforced. |
| NFR-05 | **Security — Storage** | Sensitive fields (bank details, PAN) encrypted at rest using AES-256. Database-level encryption. |
| NFR-06 | **Security — Auth** | Passwords hashed with bcrypt (cost factor 12+). JWT with short-lived access tokens + refresh tokens. |
| NFR-07 | **RBAC** | Enforced at API layer. No client-side-only permission checks. |
| NFR-08 | **Audit Trail** | Immutable audit log for all CUD operations on business entities and all approval actions. |
| NFR-09 | **Backup** | Automated daily backups via managed PostgreSQL. Tested restore procedure. RPO < 24h, RTO < 4h. |
| NFR-10 | **Observability** | Structured JSON logging. Application metrics (Prometheus-compatible). Health check endpoints. Alerting on error rates and resource saturation. |
| NFR-11 | **File Storage** | Documents stored in DigitalOcean Spaces (S3-compatible). Tenant-scoped bucket prefixes. Signed URLs for access. |
| NFR-12 | **Rate Limiting** | API rate limiting per tenant to prevent noisy-neighbor issues. |
| NFR-13 | **Data Residency** | All data stored in India region (DigitalOcean BLR1 datacenter when available, or SGP1 as nearest alternative). |
| NFR-14 | **Browser Support** | Modern evergreen browsers: Chrome, Firefox, Edge, Safari (latest 2 versions). |
| NFR-15 | **Responsive Design** | Fully functional on tablet and desktop. Mobile-responsive for read-heavy workflows. |

---

## 7. Multi-Tenancy Design

### 7.1 Model

**Shared application + shared database schema** with strict tenant scoping.

All tenant-owned tables include a `tenant_id` column. The application layer resolves tenant context from the authenticated user's JWT and injects it into every query.

### 7.2 Isolation Controls

| Layer | Mechanism |
|-------|-----------|
| **API Gateway** | Tenant context resolved from JWT; rejected if missing or mismatched |
| **Service Layer** | All repository/DAO calls pass tenant context; global query filters enforce scoping |
| **Database** | PostgreSQL Row-Level Security (RLS) policies as defense-in-depth. Indexes on (`tenant_id`, ...) for query performance |
| **File Storage** | Tenant-prefixed paths in object storage. Signed URLs with tenant validation |
| **Cache** | **Current build:** no server-side cache; PostgreSQL is the source of truth for API reads. **Future (optional):** Redis keys prefixed with `tenant:{id}:` if Spring Cache + Redis is introduced. |
| **Audit** | All audit records include `tenant_id` for attribution |

### 7.3 Tenant Lifecycle

1. **Provisioning:** Platform admin creates tenant → DB records created → admin user invited via email.
2. **Active:** Tenant users access the platform. Data accumulates.
3. **Suspended:** Tenant admin or platform admin suspends → read-only access or full lockout.
4. **Cancelled:** Data retained for grace period (90 days) → then purged or archived.

---

## 8. Technical Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Frontend** | Next.js 14+ (React 18, TypeScript) | SSR/SSG capability, strong ecosystem, TypeScript safety |
| **UI Library** | Shadcn/ui + Tailwind CSS | Modern, accessible, customizable, no vendor lock-in |
| **Backend API** | Java 21 + Spring Boot 3.x (modular monolith) | Mature, excellent multi-tenancy libraries, strong typing, proven at scale |
| **Async Processing** | Spring Boot worker profile (same codebase/image) | Report generation, email notifications, bulk operations |
| **Cache / Queue** | **Not deployed in current codebase** | No Redis in Docker Compose or Spring dependencies. Query path is PostgreSQL + TanStack Query (client). **Future options:** Redis 7 for cache and/or Streams-based job queue, or PostgreSQL outbox + worker. |
| **Database (Dev)** | PostgreSQL 16 in Docker | Local development parity |
| **Database (Prod)** | DigitalOcean Managed PostgreSQL | Automated backups, patching, HA options, private networking |
| **File Storage** | DigitalOcean Spaces (S3-compatible) | Documents, drawings, attachments. CDN-enabled |
| **Reverse Proxy** | Caddy 2.8 (containerized) | Automatic HTTPS, simple config, built-in Let's Encrypt |
| **Containerization** | Docker + Docker Compose | Simple deployment, no Kubernetes overhead |
| **CI/CD** | GitHub Actions | Build, test, push images, deploy via SSH |

### Microservice Strategy

The architecture follows a **modular monolith** pattern:

- **One backend service** with internal module boundaries (CRM, Vendor, Project, Finance, HR, Reports) organized as Spring Boot packages/modules with clean interfaces.
- **One optional worker process** running from the same Docker image with a different Spring profile (**placeholder today**; async job consumption not yet implemented).
- No service mesh, no API gateway. **No message broker** in the current deployment; a broker or Redis may be added when async workloads are implemented.
- Split into separate services only when team size, independent scaling needs, or deployment cadence demands it.

---

## 9. Architecture Overview

### 9.1 Production Logical Components

```
Internet
  │
  ▼
┌─────────────────────────────────────────────────────────┐
│  DigitalOcean Droplet (Single Host)                     │
│                                                         │
│  ┌─────────────┐   ┌──────────┐   ┌────────────────┐   │
│  │ Caddy        │──▶│ Frontend │   │ Worker         │   │
│  │ (reverse     │   │ (Next.js)│   │ (Spring Boot   │   │
│  │  proxy/TLS)  │   └──────────┘   │  worker profile│   │
│  │              │   ┌──────────┐   └───────┬────────┘   │
│  │              │──▶│ Backend  │           │             │
│  └─────────────┘   │ (Spring  ├───┐       │             │
│                     │  Boot)   │   │       │             │
│                     └──────────┘   │       │             │
│                                    ▼                     │
│                     ┌──────────────────────────┐         │
│                     │ Worker (optional profile) │         │
│                     │ — async jobs (future)    │         │
│                     └──────────────────────────┘         │
└────────────────────────────┬────────────────────────────┘
                             │ Private Network
                             ▼
              ┌──────────────────────────────┐
              │ DO Managed PostgreSQL         │
              │ (automated backups, HA)      │
              └──────────────────────────────┘
                             │
              ┌──────────────────────────────┐
              │ DO Spaces (S3-compatible)     │
              │ (documents, attachments)     │
              └──────────────────────────────┘
```

### 9.2 Request Flow

1. User navigates to `app.arqops.com` (or tenant custom domain) via browser.
2. Caddy terminates TLS and routes: `/api/*` → backend:8080, everything else → frontend:3000.
3. Frontend renders pages (SSR or client-side) and calls backend REST APIs with JWT in Authorization header.
4. Backend extracts `tenant_id` from JWT claims, sets tenant context for the request thread.
5. All DB queries are scoped to the resolved `tenant_id` via Hibernate filters + RLS.
6. Heavy operations (report generation, email dispatch, bulk imports) are **targeted for a future async worker**; today they run synchronously in the API or are not offloaded. No Redis queue in the current stack.
7. File uploads go to DO Spaces via pre-signed URLs; metadata stored in PostgreSQL.

### 9.3 Scaling Path to 1,000 Firms

| Stage | Tenants | Droplet | PostgreSQL | Strategy |
|-------|---------|---------|-----------|----------|
| **A: Launch** | 1–50 | Basic 2 vCPU / 4GB ($24/mo) | Basic 1 vCPU / 1GB ($15/mo) | Single instance of each service. Worker optional. |
| **B: Growth** | 50–200 | General 4 vCPU / 8GB ($48/mo) | Basic 2 vCPU / 4GB ($30/mo) | Enable worker when async jobs ship. Add connection pooling (PgBouncer). Consider read replica or **optional** Redis/query caching if DB-bound. |
| **C: Scale** | 200–500 | CPU-Optimized 8 vCPU / 16GB ($96/mo) | General 4 vCPU / 8GB ($60/mo) | Scale backend to 2 replicas. Offload static assets to Spaces CDN. |
| **D: Full** | 500–1,000 | Dedicated 16 vCPU / 32GB ($192/mo) | High-Perf + Read Replica ($120/mo) | 3-4 backend replicas. Dedicated worker replicas. Read replica for reports. |

Cost remains proportional because:
- No per-tenant infrastructure provisioning. Tenant onboarding is a database operation.
- Compute, DB, and replica count are upgraded incrementally based on observed load.
- Multi-tenancy and connection pooling maximize resource utilization.

---

## 10. Security & Compliance (India-Oriented)

| Area | Approach |
|------|----------|
| **GST Compliance Data** | Invoice fields include GSTIN, SAC code, HSN code, CGST/SGST/IGST breakdowns. GST summary report for filing reference. |
| **TDS Tracking** | Vendor payments track TDS section (194C, 194J, etc.), rate, and deduction amount. TDS register report. |
| **PAN / Aadhaar** | Stored encrypted. Displayed masked (last 4 digits) in UI. Full access restricted to authorized roles. |
| **Bank Details** | AES-256 encrypted at rest. Field-level encryption in application layer. |
| **Data Residency** | Prefer India region for all data storage and compute. |
| **Access Control** | Principle of least privilege. DB credentials rotated. IP allowlists on managed DB. |
| **Audit Trail** | Immutable, timestamped, actor-attributed logs for all financial and HR actions. |
| **Data Retention** | Configurable per tenant. Default 7-year retention for financial records (Indian accounting standards). |

---

## 11. Assumptions & Dependencies

### Assumptions
- Tenants are small-to-mid-size architecture firms with 5-100 employees each.
- Concurrent active users per tenant average 3-10 during business hours.
- At 1,000 tenants, peak concurrent users estimated at ~2,000-5,000.
- Email delivery uses a third-party transactional email service (e.g., Resend, Postmark) — not self-hosted.
- File uploads average ~50MB/month per tenant. At 1,000 tenants: ~50GB total storage.

### Dependencies
- DigitalOcean Managed PostgreSQL availability in chosen region.
- DigitalOcean Spaces for file storage.
- Third-party email service for transactional emails.
- Domain and DNS management for wildcard TLS certificates.

---

## 12. Acceptance Criteria (Phase 1 MVP)

| # | Criterion |
|---|-----------|
| AC-01 | Platform admin can onboard a new tenant and invite their admin user. |
| AC-02 | Tenant admin can log in, see their firm's dashboard, and manage users/roles. |
| AC-03 | No cross-tenant data leakage verifiable via security tests. |
| AC-04 | All six business modules (CRM, Vendor, Project, Finance, HR, Reports) available with baseline CRUD workflows. |
| AC-05 | CRM lead-to-project conversion workflow functions end to end. |
| AC-06 | Client invoices generated with GST fields and tracked through payment. |
| AC-07 | Vendor work orders and POs go through approval workflow. |
| AC-08 | HR attendance and leave workflows function with approval. |
| AC-09 | All listed reports are generated and exportable to CSV. |
| AC-10 | Development environment runs locally with `docker compose up` (including PostgreSQL). |
| AC-11 | Production environment runs on a single Droplet using Docker Compose with Managed PostgreSQL. |
| AC-12 | P95 API latency < 500ms for common read operations under simulated load. |
| AC-13 | Architecture and deployment documented for scaling path to 1,000 firms. |

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Single Droplet becomes SPOF | Downtime if host fails | DO Droplet backups + documented recovery procedure. Plan migration to 2-node setup at Stage C. |
| Noisy tenant (heavy usage) degrades others | Performance impact | Per-tenant rate limiting, async offloading for heavy queries, read replicas or optional Redis caching at scale |
| Data breach / cross-tenant leakage | Critical trust loss | RLS + application-layer enforcement + integration tests for isolation. Periodic security audit. |
| Managed PostgreSQL plan limits hit | Scaling bottleneck | Monitor connection count and query performance. Upgrade plan proactively. Add PgBouncer early. |
| Indian data regulation changes | Compliance risk | Modular data layer. Keep sensitive data handling in dedicated service methods for easy adaptation. |

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **Tenant** | An architecture firm subscribed to the platform |
| **GSTIN** | Goods and Services Tax Identification Number (15-digit, India) |
| **SAC** | Services Accounting Code (used in GST for service categorization) |
| **TDS** | Tax Deducted at Source (Indian withholding tax mechanism) |
| **PAN** | Permanent Account Number (10-character Indian tax ID) |
| **RLS** | Row-Level Security (PostgreSQL feature for row-level access control) |
| **RBAC** | Role-Based Access Control |
| **PO** | Purchase Order |
| **WO** | Work Order |
