# TenantGuard API Contract
**Version 1.0 | Branch: `feature/adithya-backend-scanner`**

This document is the stable interface agreement between the backend (Adithya) and the frontend (Akhil). Do not change endpoint paths, required fields, or response shapes without coordinating with the team.

---

## Base URL

| Environment | URL |
|---|---|
| Local development | `http://127.0.0.1:8000` |
| Frontend dev server | `http://localhost:5173` |

CORS is configured to allow requests from `http://localhost:5173`.

---

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens expire after 60 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`).

---

## Endpoints

### POST `/auth/login`

Authenticate a user and receive a JWT access token.

**Request body**
```json
{
  "username": "tenant_a_user",
  "password": "TenantA_demo_pw_2024"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `username` | string | ✅ | 1–80 characters |
| `password` | string | ✅ | 1+ characters |

**Success response — `200 OK`**
```json
{
  "access_token": "<jwt-token>",
  "token_type": "bearer"
}
```

**Error responses**

| Code | Condition |
|---|---|
| `401 Unauthorized` | Wrong username or password |
| `422 Unprocessable Entity` | Missing or invalid request body |

---

### GET `/invoices`

List all invoices belonging to the authenticated user's tenant.

**Headers** — `Authorization: Bearer <token>` (required)

**Success response — `200 OK`**
```json
{
  "items": [
    {
      "id": 101,
      "description": "Invoice A — Cloud Services Q4",
      "amount": 1500.0,
      "notes": "Demo invoice for Tenant Alpha"
    }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `items` | array | Always present; empty array when no invoices |
| `items[].id` | integer | Invoice primary key |
| `items[].description` | string | Invoice description |
| `items[].amount` | number | Decimal amount |
| `items[].notes` | string \| null | Optional notes |

**Error responses**

| Code | Condition |
|---|---|
| `403 Forbidden` | Missing or invalid token |

---

### GET `/invoices/{invoice_id}`

Retrieve a single invoice by ID. The invoice must belong to the authenticated user's tenant.

**Path parameter** — `invoice_id` (integer)

**Headers** — `Authorization: Bearer <token>` (required)

**Success response — `200 OK`**
```json
{
  "id": 101,
  "description": "Invoice A — Cloud Services Q4",
  "amount": 1500.0,
  "notes": "Demo invoice for Tenant Alpha"
}
```

**Error responses**

| Code | Condition |
|---|---|
| `403 Forbidden` | Missing or invalid token |
| `404 Not Found` | Invoice does not exist, OR exists but belongs to a different tenant |

> **Authorization policy:** The API returns `404` (not `403`) for cross-tenant invoice access. This avoids confirming the existence of another tenant's resources.

---

### POST `/scanner/scan`

Run a controlled BOLA security scan against the local API.

> **Restriction:** `target_base_url` must be `localhost` or `127.0.0.1`. External URLs are rejected.

**Request body**
```json
{
  "target_base_url": "http://127.0.0.1:8000",
  "tenant_a_username": "tenant_a_user",
  "tenant_a_password": "TenantA_demo_pw_2024",
  "tenant_b_username": "tenant_b_user",
  "tenant_b_password": "TenantB_demo_pw_2024",
  "tenant_a_invoice_id": 101,
  "tenant_b_invoice_id": 202
}
```

| Field | Type | Required | Default |
|---|---|---|---|
| `target_base_url` | string | ✅ | — |
| `tenant_a_username` | string | ✅ | — |
| `tenant_a_password` | string | ✅ | — |
| `tenant_b_username` | string | ✅ | — |
| `tenant_b_password` | string | ✅ | — |
| `tenant_a_invoice_id` | integer | ❌ | `101` |
| `tenant_b_invoice_id` | integer | ❌ | `202` |

**Success response — `200 OK`**
```json
{
  "report_id": "scan-a1b2c3d4",
  "status": "completed",
  "total_tests": 4,
  "vulnerabilities_found": 0,
  "results": [
    {
      "endpoint": "GET /invoices/101",
      "method": "GET",
      "test_type": "own_access",
      "actor_tenant": "tenant_a",
      "target_tenant": "tenant_a",
      "http_status": 200,
      "outcome": "not_vulnerable",
      "severity": "none",
      "evidence": "Own-access succeeded: invoice 101 returned correctly.",
      "raw_response_snippet": "{\"id\": 101, ...}"
    }
  ]
}
```

**`outcome` values**

| Value | Meaning |
|---|---|
| `vulnerable` | Cross-tenant data disclosure confirmed |
| `not_vulnerable` | Access correctly denied or own-access succeeded |
| `inconclusive` | Cannot determine — test or server error |

**`severity` values** — `high`, `medium`, `low`, `info`, `none`

**Error responses**

| Code | Condition |
|---|---|
| `400 Bad Request` | `target_base_url` is not localhost |
| `502 Bad Gateway` | Scanner encountered an internal error |

---

### GET `/scanner/reports/{report_id}`

Retrieve a previously generated scan report.

**Path parameter** — `report_id` (string, e.g. `scan-a1b2c3d4`)

**Success response — `200 OK`**

Same shape as the POST `/scanner/scan` response above.

**Error responses**

| Code | Condition |
|---|---|
| `404 Not Found` | Report not found |

---

### GET `/health`

Application health check — no authentication required.

**Response — `200 OK`**
```json
{
  "status": "ok",
  "database": "connected"
}
```

`database` is `"unreachable"` when PostgreSQL is not available.

---

## Demo Accounts

| Username | Password env var | Tenant | Invoices |
|---|---|---|---|
| `tenant_a_user` | `TENANT_A_DEMO_PASSWORD` | Tenant Alpha | 101, 102 |
| `tenant_b_user` | `TENANT_B_DEMO_PASSWORD` | Tenant Beta | 202, 203 |

---

## Error Response Shape

All error responses follow FastAPI's standard format:
```json
{
  "detail": "Human-readable error message"
}
```

---

## OpenAPI Documentation

Interactive API documentation is available at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
