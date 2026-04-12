# ArqOps REST API specification

**Version:** 1.0 (as-built)  
**Base path:** `/api/v1`  
**Backend:** Spring Boot 3 (Java 21), context path `/` (see [`backend/src/main/resources/application.yml`](backend/src/main/resources/application.yml)).

This document is the human-readable catalog of HTTP resources. **Request/response field-level schemas** are defined in Java DTOs under `backend/src/main/java/com/arqops/**/dto` and exposed at runtime via **OpenAPI**.

---

## Table of contents

1. [OpenAPI (machine-readable)](#1-openapi-machine-readable)
2. [Base URL and versioning](#2-base-url-and-versioning)
3. [Authentication and tenancy](#3-authentication-and-tenancy)
4. [CORS](#4-cors)
5. [Request and response conventions](#5-request-and-response-conventions)
6. [Pagination and sorting](#6-pagination-and-sorting)
7. [Dates and time zone](#7-dates-and-time-zone)
8. [File uploads and downloads](#8-file-uploads-and-downloads)
9. [Endpoints that do not use the JSON envelope](#9-endpoints-that-do-not-use-the-json-envelope)
10. [Public (unauthenticated) routes](#10-public-unauthenticated-routes)
11. [Actuator (operations)](#11-actuator-operations)
12. [Endpoint catalog](#12-endpoint-catalog)

---

## 1. OpenAPI (machine-readable)

| Resource | Path |
|----------|------|
| OpenAPI 3 JSON | `GET /api-docs` |
| Swagger UI | `GET /swagger-ui.html` (and `/swagger-ui/**`) |

Configuration: [`backend/src/main/resources/application.yml`](backend/src/main/resources/application.yml) (`springdoc.*`). These paths are permitted without authentication ([`SecurityConfig`](backend/src/main/java/com/arqops/common/security/SecurityConfig.java)).

---

## 2. Base URL and versioning

- All application REST resources live under **`/api/v1`**.
- In production, the browser typically calls the API on a dedicated host (for example `https://api.example.com`); the Next.js build embeds `NEXT_PUBLIC_API_BASE_URL` at build time (see [`infra/prod/README.md`](infra/prod/README.md)).

---

## 3. Authentication and tenancy

### 3.1 Tenant (organization) users

- Send **`Authorization: Bearer <access_token>`** on protected routes.
- Access tokens are issued by **`POST /api/v1/auth/login`** and refreshed via **`POST /api/v1/auth/refresh`**.
- The JWT encodes **tenant scope** and **roles/permissions**; the server sets tenant context from the token (see [`JwtAuthenticationFilter`](backend/src/main/java/com/arqops/common/security/JwtAuthenticationFilter.java)).
- **`X-Tenant-Id`** is an allowed CORS header but is **not** the primary tenancy mechanism for tenant users; do not rely on setting it instead of a correct tenant-scoped JWT.

### 3.2 Platform administrators

- Use **`POST /api/v1/platform/auth/login`** (and `/refresh`, `/logout`) for platform-scoped JWTs (**no tenant** in token).
- Platform tokens carry **`ROLE_PLATFORM_ADMIN`**.

### 3.3 Authorization on endpoints

- Most controllers use **`@PreAuthorize("hasAuthority('…')")`** or **`hasRole('…')`** for fine-grained access. Exact permission strings are defined alongside controllers (for example `project.read`, `finance.write`, `report.read`).
- **`TENANT_ADMIN`** role is expanded to **all** permission strings in the security layer (see [`JwtAuthenticationFilter`](backend/src/main/java/com/arqops/common/security/JwtAuthenticationFilter.java)).

### 3.4 Auth errors (filter chain)

When no/invalid authentication is provided for a protected route, the API may return **401** or **403** with a small JSON body (not the standard `ApiResponse` envelope):

```json
{"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
```

```json
{"error":{"code":"FORBIDDEN","message":"Access denied"}}
```

---

## 4. CORS

Allowed methods: **GET, POST, PUT, PATCH, DELETE, OPTIONS**.  
Allowed headers include **Authorization**, **Content-Type**, **X-Tenant-Id**, **Accept**.  
Origins are configured with **`app.cors.allowed-origins`** (environment **`CORS_ORIGIN`** in deployment). See [`SecurityConfig`](backend/src/main/java/com/arqops/common/security/SecurityConfig.java).

---

## 5. Request and response conventions

### 5.1 Success envelope

Defined in [`ApiResponse`](backend/src/main/java/com/arqops/common/dto/ApiResponse.java):

```json
{
  "data": { },
  "meta": {
    "page": 0,
    "size": 20,
    "totalElements": 100,
    "totalPages": 5
  }
}
```

- **`data`**: response payload (may be `null` for void operations).
- **`meta`**: present on **paginated** list endpoints (see §6); omitted when not used.

### 5.2 Error envelope (application exceptions)

Handled by [`GlobalExceptionHandler`](backend/src/main/java/com/arqops/common/exception/GlobalExceptionHandler.java):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": { "fieldName": "error message" }
  }
}
```

Common **`code`** values include **`VALIDATION_ERROR`**, **`FORBIDDEN`**, **`PAYLOAD_TOO_LARGE`**, **`INTERNAL_ERROR`**, plus domain-specific codes from **`AppException`**.

### 5.3 Content type

- JSON bodies: **`application/json`** unless noted.
- Multipart: **`multipart/form-data`** with the part names documented per endpoint.

---

## 6. Pagination and sorting

Where a method accepts Spring **`Pageable`**, clients may pass standard Spring Data query parameters:

| Parameter | Meaning |
|-----------|---------|
| `page` | Zero-based page index |
| `size` | Page size |
| `sort` | Property and direction, e.g. `sort=createdAt,desc` (repeatable) |

Endpoints that return **`meta`** with page totals are called out in the catalog below.

---

## 7. Dates and time zone

- Query parameters that are dates use **ISO-8601 calendar dates** where annotated with `@DateTimeFormat(iso = DATE)` (for example **`from=2026-01-15`**).
- Jackson uses **ISO-8601** for date-times and is configured with time zone **`Asia/Kolkata`** on the backend.

---

## 8. File uploads and downloads

- **Multipart max size:** 100 MB per file and per request ([`application.yml`](backend/src/main/resources/application.yml)).
- Upload endpoints expect the documented **`@RequestPart`** / **`@RequestParam`** names; missing parts yield **`VALIDATION_ERROR`**.

---

## 9. Endpoints that do not use the JSON envelope

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/public/tenant-logo/{tenantId}` | Binary logo or **404** |
| GET | `/api/v1/contracts/{contractId}/revisions/{revisionId}/export` | Raw **markdown** or **plain text** file bytes; `format` query: `md` (default) or `txt` |
| GET | `/api/v1/contracts/{contractId}/signed/{docId}/download` | Streaming attachment |
| GET | `/api/v1/finance/expenses/{id}/receipt/download` | Streaming attachment |
| GET | `/api/v1/files/{fileId}/download` | Streaming body |
| POST | `/api/v1/files/upload` | Multipart; response still wrapped in **`ApiResponse`** |

---

## 10. Public (unauthenticated) routes

These match **`permitAll`** in [`SecurityConfig`](backend/src/main/java/com/arqops/common/security/SecurityConfig.java) (plus **`OPTIONS /**`**).

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/auth/login` | Tenant user login |
| POST | `/api/v1/auth/refresh` | Tenant token refresh |
| POST | `/api/v1/auth/logout` | Revoke refresh token (body: `refreshToken`) |
| POST | `/api/v1/platform/auth/login` | Platform admin login |
| POST | `/api/v1/platform/auth/refresh` | Platform token refresh |
| POST | `/api/v1/platform/auth/logout` | Platform refresh revoke |
| GET | `/api/v1/tenant/storage/google/callback` | Google OAuth redirect (query: `code`, `state`, `error`) |
| POST | `/api/v1/tenant` | Tenant self-registration |
| GET | `/api/v1/public/tenant-logo/{tenantId}` | Public tenant branding |

All other **`/api/v1/*`** routes require authentication unless covered by Swagger/Actuator (below).

**Note:** [`JwtAuthenticationFilter`](backend/src/main/java/com/arqops/common/security/JwtAuthenticationFilter.java) skips parsing JWT for **POST** `/api/v1/auth/login`, **POST** `/api/v1/auth/refresh`, **POST** `/api/v1/tenant`, and **GET** `/api/v1/tenant/storage/google/callback` so stale `Authorization` headers do not interfere.

---

## 11. Actuator (operations)

Exposed under **`/actuator/*`** (not under `/api/v1`). Health probes are public; other endpoints may require authorization per Spring Boot configuration. See [`application.yml`](backend/src/main/resources/application.yml) (`management.endpoints.web.exposure.include`).

---

## 12. Endpoint catalog

Legend:

- **Auth:** `Tenant` = tenant JWT; `Platform` = platform JWT; `Public` = no JWT.
- **Body:** JSON unless **multipart** is stated.
- **Paged:** response includes **`meta`** (`PageMeta`).

### 12.1 Authentication — tenant

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/api/v1/auth/login` | Public | Body: `email`, `password` → tokens |
| POST | `/api/v1/auth/refresh` | Public | Body: `refreshToken` |
| POST | `/api/v1/auth/logout` | Public | Body: `refreshToken` |

### 12.2 Authentication — platform

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/api/v1/platform/auth/login` | Public | |
| POST | `/api/v1/platform/auth/refresh` | Public | |
| POST | `/api/v1/platform/auth/logout` | Public | |

### 12.3 Platform — tenants

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/platform/tenants` | Platform | **Paged** (`Pageable`) |
| GET | `/api/v1/platform/tenants/{id}` | Platform | |
| PATCH | `/api/v1/platform/tenants/{id}/status` | Platform | |
| POST | `/api/v1/platform/tenants` | Platform | Create tenant |

### 12.4 Tenant — profile, users, roles

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/api/v1/tenant` | Public | Register tenant |
| GET | `/api/v1/tenant/profile` | Tenant | |
| PUT | `/api/v1/tenant/profile` | Tenant | |
| POST | `/api/v1/tenant/profile/logo` | Tenant | **multipart** (`file`) |
| DELETE | `/api/v1/tenant/profile/logo` | Tenant | |
| GET | `/api/v1/tenant/users` | Tenant | **Paged** |
| GET | `/api/v1/tenant/users/{id}` | Tenant | |
| POST | `/api/v1/tenant/users` | Tenant | |
| PUT | `/api/v1/tenant/users/{id}` | Tenant | |
| DELETE | `/api/v1/tenant/users/{id}` | Tenant | |
| GET | `/api/v1/tenant/me` | Tenant | Current user |
| PUT | `/api/v1/tenant/me` | Tenant | |
| POST | `/api/v1/tenant/me/change-password` | Tenant | |
| GET | `/api/v1/tenant/roles` | Tenant | |
| POST | `/api/v1/tenant/roles` | Tenant | |
| PUT | `/api/v1/tenant/roles/{id}` | Tenant | |
| DELETE | `/api/v1/tenant/roles/{id}` | Tenant | |

### 12.5 Tenant — Google Drive storage

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/tenant/storage/google/oauth-config` | Tenant | |
| PUT | `/api/v1/tenant/storage/google/credentials` | Tenant | |
| GET | `/api/v1/tenant/storage/google/authorization-url` | Tenant | |
| GET | `/api/v1/tenant/storage/google/callback` | Public | OAuth redirect |
| POST | `/api/v1/tenant/storage/google/disconnect` | Tenant | |

### 12.6 Tenant — outbound email (SMTP)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/tenant/outbound-email` | Tenant | |
| PUT | `/api/v1/tenant/outbound-email` | Tenant | |

### 12.7 Tenant — contract AI settings

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/tenant/contract-ai` | Tenant | |
| PUT | `/api/v1/tenant/contract-ai` | Tenant | |

### 12.8 Public branding

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/public/tenant-logo/{tenantId}` | Public | Binary; not `ApiResponse` |

### 12.9 Files (storage)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/api/v1/files/upload-session` | Tenant | |
| POST | `/api/v1/files/upload` | Tenant | **multipart** (`file`); optional `folderPath` |
| GET | `/api/v1/files/{fileId}/download` | Tenant | Stream; not `ApiResponse` |

### 12.10 Audit logs

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/audit-logs` | Tenant | **TENANT_ADMIN**; **Paged** |
| GET | `/api/v1/audit-logs/entity/{entityType}/{entityId}` | Tenant | **TENANT_ADMIN**; **Paged** |

### 12.11 CRM — clients and contacts

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/crm/clients` | Tenant | **Paged**; optional `search` |
| GET | `/api/v1/crm/clients/{id}` | Tenant | |
| POST | `/api/v1/crm/clients` | Tenant | |
| PUT | `/api/v1/crm/clients/{id}` | Tenant | |
| DELETE | `/api/v1/crm/clients/{id}` | Tenant | |
| GET | `/api/v1/crm/clients/{clientId}/contacts` | Tenant | |
| POST | `/api/v1/crm/clients/{clientId}/contacts` | Tenant | |
| PUT | `/api/v1/crm/clients/{clientId}/contacts/{contactId}` | Tenant | |
| DELETE | `/api/v1/crm/clients/{clientId}/contacts/{contactId}` | Tenant | |
| GET | `/api/v1/crm/clients/{clientId}/history` | Tenant | |

### 12.12 CRM — leads

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/crm/leads` | Tenant | **Paged**; optional `stage` |
| GET | `/api/v1/crm/leads/{id}` | Tenant | |
| POST | `/api/v1/crm/leads` | Tenant | |
| PUT | `/api/v1/crm/leads/{id}` | Tenant | |
| DELETE | `/api/v1/crm/leads/{id}` | Tenant | |
| POST | `/api/v1/crm/leads/{id}/convert` | Tenant | |
| GET | `/api/v1/crm/leads/stages` | Tenant | |

### 12.13 CRM — activities

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/crm/activities` | Tenant | Required query: `entityType`, `entityId` |
| POST | `/api/v1/crm/activities` | Tenant | |

### 12.14 Projects — projects, tasks, documents, resources, budget, comments

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/project/projects` | Tenant | **Paged**; optional `q` |
| GET | `/api/v1/project/projects/{id}` | Tenant | |
| POST | `/api/v1/project/projects` | Tenant | |
| PUT | `/api/v1/project/projects/{id}` | Tenant | |
| DELETE | `/api/v1/project/projects/{id}` | Tenant | |
| GET | `/api/v1/project/projects/{id}/tasks` | Tenant | **Paged** |
| POST | `/api/v1/project/projects/{id}/tasks` | Tenant | |
| GET | `/api/v1/project/projects/{id}/budget` | Tenant | |
| GET | `/api/v1/project/projects/{id}/documents` | Tenant | |
| POST | `/api/v1/project/projects/{id}/documents` | Tenant | |
| DELETE | `/api/v1/project/projects/{projectId}/documents/{docId}` | Tenant | |
| GET | `/api/v1/project/projects/{projectId}/documents/{docId}/download` | Tenant | |
| GET | `/api/v1/project/projects/{id}/resources` | Tenant | |
| POST | `/api/v1/project/projects/{id}/resources` | Tenant | |
| PUT | `/api/v1/project/projects/{projectId}/resources/{resId}` | Tenant | |
| DELETE | `/api/v1/project/projects/{projectId}/resources/{resId}` | Tenant | |
| GET | `/api/v1/project/projects/{id}/budget-lines` | Tenant | |
| POST | `/api/v1/project/projects/{id}/budget-lines` | Tenant | |
| PUT | `/api/v1/project/projects/{projectId}/budget-lines/{lineId}` | Tenant | |
| DELETE | `/api/v1/project/projects/{projectId}/budget-lines/{lineId}` | Tenant | |
| GET | `/api/v1/project/tasks/{taskId}/comments` | Tenant | |
| POST | `/api/v1/project/tasks/{taskId}/comments` | Tenant | |

### 12.15 Projects — task by id

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/project/tasks/{id}` | Tenant | |
| PUT | `/api/v1/project/tasks/{id}` | Tenant | |
| DELETE | `/api/v1/project/tasks/{id}` | Tenant | |

### 12.16 Projects — phases and milestones

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/api/v1/project/projects/{projectId}/phases` | Tenant | `project.write` |
| PUT | `/api/v1/project/phases/{phaseId}` | Tenant | |
| DELETE | `/api/v1/project/phases/{phaseId}` | Tenant | `project.delete` |
| POST | `/api/v1/project/phases/{phaseId}/milestones` | Tenant | |
| PUT | `/api/v1/project/milestones/{milestoneId}` | Tenant | |
| DELETE | `/api/v1/project/milestones/{milestoneId}` | Tenant | |

### 12.17 Projects — settings (templates)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/project/settings/phase-templates` | Tenant | |
| PUT | `/api/v1/project/settings/phase-templates/{projectType}` | Tenant | |
| GET | `/api/v1/project/settings/task-templates` | Tenant | |
| PUT | `/api/v1/project/settings/task-templates/{projectType}` | Tenant | |

### 12.18 Projects — project types

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/project/project-types` | Tenant | |
| PUT | `/api/v1/project/project-types` | Tenant | Replace all |

### 12.19 Contracts

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/contracts` | Tenant | **Paged** (default size 20, sort `updatedAt` desc); query: `projectId`, `status`, `q` |
| GET | `/api/v1/contracts/{id}` | Tenant | |
| POST | `/api/v1/contracts` | Tenant | |
| PUT | `/api/v1/contracts/{id}` | Tenant | |
| DELETE | `/api/v1/contracts/{id}` | Tenant | |
| PUT | `/api/v1/contracts/{id}/parties` | Tenant | Body optional list |
| POST | `/api/v1/contracts/{id}/revisions` | Tenant | Manual revision |
| POST | `/api/v1/contracts/{id}/revisions/generate` | Tenant | AI / generated revision |
| GET | `/api/v1/contracts/{contractId}/revisions/{revisionId}/export` | Tenant | Raw file; query `format`: `md` or `txt` |
| POST | `/api/v1/contracts/{id}/send` | Tenant | |
| GET | `/api/v1/contracts/{id}/signed` | Tenant | |
| POST | `/api/v1/contracts/{id}/signed` | Tenant | **multipart** `file`; optional `revisionId` |
| GET | `/api/v1/contracts/{contractId}/signed/{docId}/download` | Tenant | Stream |

### 12.20 Finance — invoices and payments

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/finance/invoices` | Tenant | **Paged** |
| GET | `/api/v1/finance/invoices/{id}` | Tenant | |
| POST | `/api/v1/finance/invoices` | Tenant | |
| PUT | `/api/v1/finance/invoices/{id}` | Tenant | |
| DELETE | `/api/v1/finance/invoices/{id}` | Tenant | |
| GET | `/api/v1/finance/invoices/{id}/payments` | Tenant | |
| POST | `/api/v1/finance/invoices/{id}/payments` | Tenant | |

### 12.21 Finance — expenses

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/finance/expenses` | Tenant | **Paged** |
| GET | `/api/v1/finance/expenses/{id}` | Tenant | |
| POST | `/api/v1/finance/expenses` | Tenant | |
| PUT | `/api/v1/finance/expenses/{id}` | Tenant | |
| DELETE | `/api/v1/finance/expenses/{id}` | Tenant | |
| GET | `/api/v1/finance/expenses/{id}/receipt/download` | Tenant | Stream |

### 12.22 Finance — vendor bills

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/finance/vendor-bills` | Tenant | **Paged** |
| GET | `/api/v1/finance/vendor-bills/{id}` | Tenant | |
| POST | `/api/v1/finance/vendor-bills` | Tenant | |
| PUT | `/api/v1/finance/vendor-bills/{id}` | Tenant | |
| DELETE | `/api/v1/finance/vendor-bills/{id}` | Tenant | |

### 12.23 Finance — expense categories

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/finance/expense-categories` | Tenant | |
| PUT | `/api/v1/finance/expense-categories` | Tenant | Replace all |

### 12.24 Finance — SAC codes

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/finance/sac-codes` | Tenant | |
| PUT | `/api/v1/finance/sac-codes` | Tenant | Replace all |

### 12.25 Vendor — vendors

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/vendor/vendors` | Tenant | **Paged**; optional `q` |
| GET | `/api/v1/vendor/vendors/{id}` | Tenant | |
| POST | `/api/v1/vendor/vendors` | Tenant | |
| PUT | `/api/v1/vendor/vendors/{id}` | Tenant | |
| DELETE | `/api/v1/vendor/vendors/{id}` | Tenant | |

### 12.26 Vendor — scorecards

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/vendor/vendors/{vendorId}/scorecards` | Tenant | |
| POST | `/api/v1/vendor/vendors/{vendorId}/scorecards` | Tenant | |
| DELETE | `/api/v1/vendor/vendors/{vendorId}/scorecards/{id}` | Tenant | |

### 12.27 Vendor — work orders

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/vendor/work-orders` | Tenant | **Paged**; optional `vendorId` |
| GET | `/api/v1/vendor/work-orders/{id}` | Tenant | |
| POST | `/api/v1/vendor/work-orders` | Tenant | |
| PUT | `/api/v1/vendor/work-orders/{id}` | Tenant | |
| DELETE | `/api/v1/vendor/work-orders/{id}` | Tenant | |
| POST | `/api/v1/vendor/work-orders/{id}/approve` | Tenant | |

### 12.28 Vendor — purchase orders

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/vendor/purchase-orders` | Tenant | **Paged**; optional `workOrderId` |
| GET | `/api/v1/vendor/purchase-orders/{id}` | Tenant | |
| POST | `/api/v1/vendor/purchase-orders` | Tenant | |
| PUT | `/api/v1/vendor/purchase-orders/{id}` | Tenant | |
| DELETE | `/api/v1/vendor/purchase-orders/{id}` | Tenant | |
| POST | `/api/v1/vendor/purchase-orders/{id}/approve` | Tenant | |

### 12.29 HR — employees

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/hr/employees` | Tenant | **Paged** |
| POST | `/api/v1/hr/employees` | Tenant | |
| GET | `/api/v1/hr/employees/{id}` | Tenant | |
| PUT | `/api/v1/hr/employees/{id}` | Tenant | |
| DELETE | `/api/v1/hr/employees/{id}` | Tenant | |

### 12.30 HR — attendance

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/hr/attendance` | Tenant | Query: `from`, `to` (date, required); optional `employeeId` |
| POST | `/api/v1/hr/attendance` | Tenant | |

### 12.31 HR — leave types

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/hr/leave-types` | Tenant | |
| POST | `/api/v1/hr/leave-types` | Tenant | |
| PUT | `/api/v1/hr/leave-types/{id}` | Tenant | |
| DELETE | `/api/v1/hr/leave-types/{id}` | Tenant | |

### 12.32 HR — leave requests

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/hr/leave-requests` | Tenant | **Paged**; optional `employeeId` |
| POST | `/api/v1/hr/leave-requests` | Tenant | |
| POST | `/api/v1/hr/leave-requests/{id}/approve` | Tenant | `hr.approve` |
| POST | `/api/v1/hr/leave-requests/{id}/reject` | Tenant | `hr.approve` |

### 12.33 HR — holidays

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/hr/holidays` | Tenant | Optional query `year` |
| POST | `/api/v1/hr/holidays` | Tenant | |
| PUT | `/api/v1/hr/holidays/{id}` | Tenant | |
| DELETE | `/api/v1/hr/holidays/{id}` | Tenant | |

### 12.34 HR — time entries

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/hr/time-entries` | Tenant | Query: `from`, `to` (required); optional `employeeId` |
| PUT | `/api/v1/hr/time-entries` | Tenant | Sync payload |

### 12.35 HR — designation rates

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/hr/designation-rates` | Tenant | |
| PUT | `/api/v1/hr/designation-rates` | Tenant | Replace all |

### 12.36 HR — reimbursements

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/v1/hr/reimbursements` | Tenant | **Paged**; optional `employeeId`, `status` |
| POST | `/api/v1/hr/reimbursements` | Tenant | |
| POST | `/api/v1/hr/reimbursements/{id}/approve` | Tenant | |
| POST | `/api/v1/hr/reimbursements/{id}/reject` | Tenant | |

### 12.37 Reports

All require **`report.read`**. Query parameters **`from`**, **`to`** (optional, ISO date) apply only where noted.

| Method | Path | Query |
|--------|------|--------|
| GET | `/api/v1/reports/dashboard` | optional `from`, `to` |
| GET | `/api/v1/reports/crm/pipeline` | — |
| GET | `/api/v1/reports/crm/lead-source` | — |
| GET | `/api/v1/reports/projects/status` | — |
| GET | `/api/v1/reports/projects/budget-variance` | — |
| GET | `/api/v1/reports/finance/receivables` | — |
| GET | `/api/v1/reports/finance/payables` | — |
| GET | `/api/v1/reports/finance/revenue-expenses` | optional `from`, `to` |
| GET | `/api/v1/reports/finance/gst` | optional `from`, `to` |
| GET | `/api/v1/reports/finance/expense-by-category` | optional `from`, `to` |
| GET | `/api/v1/reports/hr/attendance` | optional `from`, `to` |
| GET | `/api/v1/reports/hr/leave-summary` | — |
| GET | `/api/v1/reports/vendor/performance` | — |
| GET | `/api/v1/reports/hr/payroll-register` | — |
| GET | `/api/v1/reports/crm/conversion-rate` | — |
| GET | `/api/v1/reports/crm/activity-by-member` | — |
| GET | `/api/v1/reports/projects/milestone-slippage` | — |
| GET | `/api/v1/reports/projects/resource-utilization` | — |
| GET | `/api/v1/reports/vendor/wo-po-summary` | — |
| GET | `/api/v1/reports/projects/profitability` | — |
| GET | `/api/v1/reports/finance/tds-register` | — |
| GET | `/api/v1/reports/hr/headcount-attrition` | — |
| GET | `/api/v1/reports/hr/reimbursement-summary` | — |

---

## Related documents

- [LOW_LEVEL_DESIGN.md](LOW_LEVEL_DESIGN.md) — implementation overview, `ApiResponse`, security, and modules.
- [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) — system architecture.
- [BRD.md](BRD.md) — business requirements.

---

## Maintenance

When adding or changing controllers:

1. Update this catalog (§12) and §9–§10 if routes or auth change.
2. Rely on **springdoc** for field-level schemas, or add `@Schema` annotations on DTOs for richer OpenAPI output.
