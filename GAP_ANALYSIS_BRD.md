# Gap Analysis: Implementation vs. BRD (ArqOps v1.0)

**Reference:** [BRD.md](BRD.md) (dated 2026-03-24)  
**Scope:** Current codebase (Spring Boot backend, Next.js frontend, Flyway schema).  
**Legend:** **Met** = implemented end-to-end | **Partial** = subset or UX/API differs | **Gap** = not implemented or materially incomplete

---

## Executive summary

| Area | Met | Partial | Gap |
|------|-----|---------|-----|
| IAM & tenancy | Core auth, RBAC, tenant profile | Platform admin model, subscription lifecycle | RLS, invitation email, vendor role UX |
| CRM | CRUD, pipeline view, stages, activities | Kanban UX, conversion flow | Drag-and-drop, proposal attachments, reminders |
| Vendor | WO/PO, bills, scorecards, encryption | Approvals (single-step) | Multi-level WO, amendments, vendor portal, per-vendor aging report |
| Project | Phases, milestones, tasks, docs, budget, resources | Comments (no file attach on tasks) | Task Kanban, doc versioning, budget alerts |
| Finance | Invoices, payments, GST fields, expenses, TDS on bills | Dashboard trends (table/report, not always charts) | Milestone-linked invoicing, configurable invoice prefix, payable approval workflow |
| HR | Employees, attendance, leave, holidays, reimbursements → expense | Salary JSON, payroll register report | Leave rollover automation, employee document library |
| Reports & dashboard | Broad report API + UI + CSV on many pages | Some BRD nuance | Pipeline by project type, per-vendor aging, drill-down depth |
| NFRs | HTTPS in prod, bcrypt(12), JWT, AES for some fields, actuator | Observability basics | RLS, rate limits, P95 proof, optional future Redis/cache, structured JSON logs everywhere |

**Cross-cutting:** Automated tests are **not** present in-repo (see [LOW_LEVEL_DESIGN.md](LOW_LEVEL_DESIGN.md)); BRD acceptance criteria AC-03 and AC-12 are **not** evidenced by CI/load tests.

---

## 5.1 Multi-Tenant IAM

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-IAM-01 | Platform admin onboards tenant (name, slug, admin email, plan) | **Partial** | `POST /api/v1/tenant` is public; no distinct **platform-admin** role or separate admin API. Tenant + admin user created via service; not “invite-only” email flow. |
| FR-IAM-02 | Isolated namespace; all data scoped by `tenant_id` | **Met** | `TenantAwareEntity`, Hibernate `tenantFilter`, `TenantHibernateFilter`, JWT `tenant_id`. |
| FR-IAM-03 | Firm profile: logo, address, GSTIN, PAN, SAC, bank | **Partial** | Profile update exists; SAC/bank depth depends on `settings_json` / DTO fields—verify parity with BRD UI. |
| FR-IAM-04 | Subscription status (active/suspended/cancelled) — platform-controlled | **Partial** | `tenants.status` exists; **platform-only** enforcement and suspended read-only behavior **not** fully modeled as separate platform APIs. |
| FR-IAM-05 | Email + password, bcrypt | **Met** | `BCryptPasswordEncoder(12)`. |
| FR-IAM-06 | JWT, configurable expiry | **Met** | `app.jwt.*` (access + refresh). |
| FR-IAM-07 | Predefined roles: Tenant Admin, Project Lead, Finance Manager, HR Admin, Staff, Vendor | **Partial** | `TENANT_ADMIN` + **custom roles** with JSON permissions; **not** six fixed system roles seeded by name with BRD semantics; **Vendor** external login not implemented. |
| FR-IAM-08 | Custom roles with granular permissions | **Met** | `RoleService`, `Permissions` constants, UI in settings. |
| FR-IAM-09 | APIs enforce tenant isolation + permissions | **Met** | `@PreAuthorize` + tenant filter; `FileController` has **no** `@PreAuthorize` (see below). |
| FR-IAM-10 | Every CUD/approval logged with actor, tenant, entity, action, time, IP | **Partial** | `AuditService` logs many flows; **not** uniformly applied to every entity/service (e.g. finance/invoices may not all audit). |
| FR-IAM-11 | Immutable, queryable audit for tenant admin | **Partial** | `audit_logs` + `AuditController` (TENANT_ADMIN); **immutability** is by convention (no update API). |

---

## 5.2 CRM

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-CRM-01 | Client CRUD with type, GSTIN, PAN, addresses, segment | **Partial** | Core fields; **site address** vs billing only in JSON—confirm UI parity. |
| FR-CRM-02 | Multiple contacts per client | **Met** | `contacts` table + APIs. |
| FR-CRM-03 | Client history: leads, projects, invoices, communications | **Partial** | Aggregated **history** endpoint + UI tab; **communications** beyond activities may be incomplete. |
| FR-CRM-04 | Leads with source, client, project type, value, location | **Met** | |
| FR-CRM-05 | Configurable pipeline stages per tenant | **Met** | `lead_stages` + seed. |
| FR-CRM-06 | Drag-and-drop Kanban | **Gap** | Pipeline UI exists (columns); **no** drag-and-drop in `crm/pipeline` page (no DnD handlers found). |
| FR-CRM-07 | Proposal documents / fee estimates on opportunities | **Gap** | No first-class “proposal” attachment on lead entity; generic file upload may be used manually—**not** productized per lead. |
| FR-CRM-08 | Convert won opportunity → project (auto-populate) | **Partial** | `Project` has `leadId`; `LeadService` logs conversion; **auto-populate** from lead is **manual** (user fills project form with `leadId`). |
| FR-CRM-09 | Activities: calls, meetings, emails, site visits | **Met** | |
| FR-CRM-10 | Follow-up tasks with due dates and reminders | **Gap** | Tasks are **project-scoped**; **no** dedicated CRM follow-up task/reminder model tied to leads. |
| FR-CRM-11 | Activity timeline per client and per lead | **Partial** | Activities by entity; **dedicated timeline** UX may vary by screen. |

---

## 5.3 Vendor Management

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-VND-01 | Vendor master with category, GSTIN, PAN, bank encrypted | **Met** | `EncryptionService` for sensitive fields. |
| FR-VND-02 | Categorization and tagging / filter | **Partial** | Category/specialty; **free-form tags** if not in schema. |
| FR-VND-03 | Vendor document storage | **Partial** | Generic presigned URLs; **no** structured “registration cert” entity. |
| FR-VND-04 | Work orders linked to vendor + project | **Met** | |
| FR-VND-05 | Multi-level WO approval (configurable) | **Gap** | Single-step `approved_by` / status; **no** two-level configurable workflow. |
| FR-VND-06 | WO amendments and version history | **Gap** | No amendment/version table. |
| FR-VND-07 | POs with line items, GST | **Partial** | `line_items_json` + GST; **auto GST computation** from line items may be manual. |
| FR-VND-08 | PO approval workflow | **Partial** | Status + approver; not multi-step. |
| FR-VND-09 | PO delivery status; link to vendor invoices | **Partial** | **Vendor bills** link to WO; PO→bill linkage **not** as rich as BRD “delivery status” tracking. |
| FR-VND-10 | Vendor invoices and payment schedules vs WO | **Partial** | Bills; **payment schedule** as separate entity not evident. |
| FR-VND-11 | Payment aging **per vendor** | **Gap** | Payables aging report exists; **per-vendor** slice is **not** a dedicated BRD-style report. |
| FR-VND-12 | Scorecards 1–5 | **Met** | |

---

## 5.4 Project Management

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-PRJ-01 | Create from conversion or manual | **Partial** | Manual + `leadId`; **no** single-click wizard from lead. |
| FR-PRJ-02 | Project fields | **Met** | |
| FR-PRJ-03 | Phases (default architecture sequence) | **Partial** | Phases are **tenant-defined** per project; **default template** seed may be partial. |
| FR-PRJ-04 | Milestones with target dates and deliverables | **Met** | |
| FR-PRJ-05 | Tasks with assignee, priority, status, due date | **Met** | Status values may differ slightly from BRD wording. |
| FR-PRJ-06 | Task comments and **attachments** | **Partial** | **Comments** implemented; **task attachments** not as first-class. |
| FR-PRJ-07 | Task board Kanban and list | **Partial** | List views; **Kanban board** for tasks **not** verified as full BRD parity. |
| FR-PRJ-08 | Document repository **with folder structure** | **Partial** | `folder_path` on documents; **no** nested folder browser** requirement** may be partial. |
| FR-PRJ-09 | Upload via presigned URLs | **Met** | |
| FR-PRJ-10 | Version tracking for documents | **Gap** | `version` column exists; **no** multi-version history UX/API. |
| FR-PRJ-11 | Resource assignment with roles | **Met** | |
| FR-PRJ-12 | Team member load across projects | **Partial** | Resource utilization report; **dedicated “load” dashboard** may be minimal. |
| FR-PRJ-13 | Budget line items by category | **Met** | |
| FR-PRJ-14 | Actuals from vendor payables + expenses | **Partial** | Budget lines have `actual_amount`; **rollup** from finance may be **manual** or partial. |
| FR-PRJ-15 | Budget variance **alerts** (thresholds) | **Gap** | Variance **report** exists; **no** proactive alert/notification system. |

---

## 5.5 Finance

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-FIN-01 | Invoices linked to **milestones** or custom lines | **Partial** | Line items JSON; **no** FK `milestone_id` on invoice. |
| FR-FIN-02 | Invoice number, SAC, CGST/SGST/IGST, totals | **Partial** | Fields present; **IGST vs CGST/SGST by state** not automated as rules engine; **invoice prefix** configurable—verify. |
| FR-FIN-03 | Status: Draft → Sent → Partial → Paid → Overdue | **Partial** | Implemented; exact enum parity with BRD to confirm. |
| FR-FIN-04 | Payments against invoices | **Met** | |
| FR-FIN-05 | Receivables aging | **Met** | |
| FR-FIN-06 | Vendor bills linked to WO/PO | **Partial** | WO link; **PO** link on bill not primary. |
| FR-FIN-07 | TDS metadata | **Met** | |
| FR-FIN-08 | Payable **scheduling** and approval workflow | **Gap** | Bill status; **no** rich schedule + approval chain as BRD. |
| FR-FIN-09 | Payables aging | **Met** | |
| FR-FIN-10 | Expenses by project / overhead | **Met** | |
| FR-FIN-11 | Expense categories | **Met** | |
| FR-FIN-12 | Attach receipts | **Partial** | `receipt_storage_key`; **UX** completeness varies. |
| FR-FIN-13 | Project P&L | **Met** | Report + dashboard metrics. |
| FR-FIN-14 | Firm receivables vs payables summary | **Partial** | Dashboard KPIs; **dedicated** summary page as BRD “dashboard” may differ. |
| FR-FIN-15 | Monthly revenue/expense **trends** | **Partial** | Revenue & expenses report; **chart** vs table depends on UI. |
| FR-FIN-16 | GST summary | **Met** | |

---

## 5.6 HR

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-HR-01 | Employee master + emergency contact | **Met** | Including emergency fields (V16). |
| FR-HR-02 | Employee document storage | **Gap** | No structured doc types (offer letter, ID proof) as entities; generic file only. |
| FR-HR-03 | Status: active, on notice, resigned, terminated | **Partial** | **on_notice** in reports; **confirm** all transitions in UI. |
| FR-HR-04 | Attendance | **Met** | |
| FR-HR-05 | Configurable leave types | **Met** | |
| FR-HR-06 | Leave approval workflow | **Partial** | Approver user; **reporting manager** routing not enforced. |
| FR-HR-07 | Leave balance and **rollover rules** | **Partial** | Balances exist; **rollover automation/rules engine** not evident. |
| FR-HR-08 | Holiday calendar | **Met** | |
| FR-HR-09 | Salary structure components | **Partial** | `salary_structure_json` + payroll register report. |
| FR-HR-10 | Monthly payroll register (metadata) | **Met** | |
| FR-HR-11 | PF, ESI, PT metadata | **Partial** | JSON keys; **validation** may be loose. |
| FR-HR-12 | Reimbursements with receipts | **Met** | |
| FR-HR-13 | Reimbursement approval | **Met** | |
| FR-HR-14 | Link approved reimbursements to finance | **Met** | `expense_id` on reimbursement + expense creation on approve. |

---

## 5.7 Reports & Dashboards

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-RPT-01 | Pipeline by stage, source, **project type** | **Partial** | Pipeline + lead source; **by project type** as dedicated dimension **not** explicit in all reports. |
| FR-RPT-02 | Conversion rate & cycle time | **Met** | |
| FR-RPT-03 | Activity by team member | **Met** | |
| FR-RPT-04 | Active projects overview | **Met** | Project status report. |
| FR-RPT-05 | Milestone slippage | **Met** | |
| FR-RPT-06 | Resource utilization | **Met** | |
| FR-RPT-07 | Vendor payment aging | **Partial** | Payables aging exists; **vendor-centric** aging report **not** same as FR-RPT-07 wording. |
| FR-RPT-08 | Vendor performance | **Met** | |
| FR-RPT-09 | WO/PO summary by project | **Met** | |
| FR-RPT-10 | Receivables aging | **Met** | |
| FR-RPT-11 | Payables aging | **Met** | |
| FR-RPT-12 | Project profitability | **Met** | |
| FR-RPT-13 | Monthly revenue & expense | **Met** | |
| FR-RPT-14 | GST summary | **Met** | |
| FR-RPT-15 | TDS register | **Met** | |
| FR-RPT-16 | Attendance summary | **Met** | |
| FR-RPT-17 | Leave balance / utilization | **Partial** | Leave summary + **balance** report depth—verify “utilization” vs BRD. |
| FR-RPT-18 | Headcount & attrition | **Met** | |
| FR-RPT-19 | Reimbursement summary | **Met** | |
| FR-RPT-20 | Executive dashboard KPIs | **Met** | Extended with extra KPIs + date range. |
| FR-RPT-21 | All reports **exportable to CSV** | **Partial** | Many pages export; **not** every report page guaranteed—spot-check. |
| FR-RPT-22 | Date-range **and drill-down** | **Partial** | Date range on dashboard + several reports; **drill-down** (click KPI → filtered detail) **limited**. |

---

## 6. Non-Functional Requirements

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| NFR-01 | Tenant isolation at all layers | **Partial** | App + Hibernate filter; **PostgreSQL RLS** **not** implemented. |
| NFR-02 | P95 &lt; 500ms reads; dashboard &lt; 2s | **Gap** | No committed load test results in repo. |
| NFR-03 | 99.5% uptime | **Gap** | Operational/SLA; not code-enforced. |
| NFR-04 | TLS everywhere | **Met** | Prod via Caddy; dev HTTP. |
| NFR-05 | AES-256 at rest; DB encryption | **Partial** | Field-level encryption for selected fields; **managed DB encryption** is infra (DO). |
| NFR-06 | bcrypt 12+, JWT + refresh | **Met** | |
| NFR-07 | RBAC at API | **Met** | |
| NFR-08 | Immutable audit for CUD/approvals | **Partial** | Audit service + partial coverage; **not** 100% entities. |
| NFR-09 | Backups, RPO/RTO | **Gap** | Managed DB policy; **restore testing** not in repo. |
| NFR-10 | Structured JSON logs, metrics, health, alerting | **Partial** | Actuator + Prometheus exposure; **structured JSON** and **alerting** not fully described in app config. |
| NFR-11 | Spaces + tenant-prefixed paths + signed URLs | **Partial** | `StorageService.buildKey`; **`FileController` not secured** with `@PreAuthorize`—**tenant validation** on key access should be hardened. |
| NFR-12 | **Rate limiting per tenant** | **Gap** | Not implemented. |
| NFR-13 | Data residency India | **Gap** | Deployment/config dependent; not enforced in code. |
| NFR-14 | Evergreen browsers | **Assumed** | |
| NFR-15 | Responsive | **Partial** | Tailwind; tablet/desktop focus per BRD. |

---

## 7. Multi-Tenancy Design (§7.2)

| Layer | BRD | Implementation |
|-------|-----|----------------|
| API gateway | Tenant from JWT | **No separate gateway**; filter validates JWT. |
| Service | Tenant on queries | **Met** + Hibernate filter on repositories. |
| Database | **RLS** | **Gap** |
| File storage | Tenant prefix + signed URLs | **Partial** | Prefix in buildKey; **authorize download** by tenant ownership of `storage_key` **not** verified in `FileController`. |
| Cache | Redis `tenant:{id}:` prefix (BRD target) | **Gap** | **No Redis** in stack (`pom.xml`, Compose). No server-side Spring Cache; APIs read PostgreSQL directly. |
| Audit | `tenant_id` on records | **Met** | |

---

## 5.4 Out of Scope (Phase 1) — BRD

These remain **correctly out of scope** per BRD: native mobile apps, full payroll disbursement, statutory **filing** automation, CAD/BIM in-app, WhatsApp/SMS, multi-currency, **timesheets**, client portal.

---

## §12 Acceptance Criteria (quick)

| AC | Criterion | Status |
|----|-----------|--------|
| AC-01 | Platform admin onboards tenant + invites admin | **Partial** | Tenant creation exists; **email invite** flow not full product. |
| AC-02 | Tenant admin login, dashboard, users/roles | **Met** | |
| AC-03 | No cross-tenant leakage (security tests) | **Gap** | **No automated** isolation tests in repo. |
| AC-04 | Six modules with baseline CRUD | **Partial** | Broad coverage; gaps above (e.g. vendor portal). |
| AC-05 | Lead → project E2E | **Partial** | Manual path with `leadId`; not full conversion wizard. |
| AC-06 | GST invoices through payment | **Met** | |
| AC-07 | WO/PO approval workflow | **Partial** | Single-level; not multi-level. |
| AC-08 | HR attendance & leave with approval | **Met** | |
| AC-09 | Reports + CSV | **Partial** | Most reports; CSV coverage not 100% verified. |
| AC-10 | `docker compose up` | **Met** | `docker-compose.dev.yml`. |
| AC-11 | Prod single Droplet + managed PG | **Partial** | `docker-compose.prod.yml` + docs; **operational** validation external. |
| AC-12 | P95 &lt; 500ms under load | **Gap** | No load test artifacts. |
| AC-13 | Scaling documentation | **Met** | TECHNICAL_ARCHITECTURE / BRD |

---

## Suggested priority backlog (product + engineering)

1. **Security / compliance:** Secure `FileController` (auth + tenant-scoped key validation); add RLS or document explicit risk acceptance; rate limiting (NFR-12).  
2. **BRD fidelity:** Drag-and-drop pipeline; lead conversion wizard; milestone-linked invoicing; budget alerts; vendor portal or explicit deferral.  
3. **Platform:** Platform-admin role, tenant lifecycle (suspend/cancel), email invite.  
4. **Async worker:** Implement job consumers per BRD (reports/email/bulk)—**profile only** today; choose queue mechanism (e.g. PostgreSQL outbox, Redis Streams, or managed queue) when building.  
5. **Quality:** Automated tests (tenant isolation, RBAC, API contracts), load tests for AC-12; GitHub Actions CI per BRD.

---

*This analysis is a point-in-time snapshot. Re-run after major releases or when BRD changes.*
