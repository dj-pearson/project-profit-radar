# Brikly API Reference

**Version**: 1.0.0
**Base URL**: `https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1`
**Last Updated**: 2026-02-25

Brikly provides a RESTful API built on Supabase Edge Functions. The API allows programmatic access to projects, estimates, invoices, time tracking, financial data, documents, team management, CRM, AI services, and webhooks.

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Projects](#projects)
- [Estimates](#estimates)
- [Invoices](#invoices)
- [Time Tracking](#time-tracking)
- [Financial Records](#financial-records)
- [Documents](#documents)
- [Team Members](#team-members)
- [CRM - Contacts](#crm---contacts)
- [CRM - Leads](#crm---leads)
- [AI Services](#ai-services)
- [API Key Management](#api-key-management)
- [Webhooks](#webhooks)
- [Auth OTP](#auth-otp)

---

## Authentication

All API requests require authentication. Brikly supports two authentication methods:

### 1. API Key Authentication

Pass your API key in the `x-api-key` header. API keys are scoped with specific permissions and are tied to a company.

```
x-api-key: bd_live_abc123def456...
```

### 2. Bearer JWT Token

Pass a valid Supabase JWT token in the `Authorization` header. Tokens are obtained through the Supabase Auth sign-in flow.

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Required Headers

| Header | Required | Description |
|--------|----------|-------------|
| `x-api-key` | Conditional | API key for external integrations |
| `Authorization` | Conditional | Bearer JWT token for authenticated users |
| `Content-Type` | Yes (POST/PUT) | Must be `application/json` |
| `apikey` | Yes | Supabase project anon key |

> **Note**: Either `x-api-key` or `Authorization` must be provided. API key authentication is recommended for server-to-server integrations. JWT tokens are used for user-facing applications.

### API Key Scopes

API keys have permission scopes that control access:

| Scope | Description |
|-------|-------------|
| `read` | Read-only access to resources |
| `write` | Create and update resources (includes `read`) |
| `delete` | Delete resources |
| `admin` | Full access to all resources |
| `projects:read` | Read access to projects |
| `projects:write` | Write access to projects |
| `estimates:read` | Read access to estimates |
| `estimates:write` | Write access to estimates |
| `invoices:read` | Read access to invoices |
| `invoices:write` | Write access to invoices |
| `*` | Wildcard - all permissions |

---

## Rate Limiting

API requests are subject to rate limits to ensure service stability.

| Endpoint Category | Limit |
|-------------------|-------|
| General API | 100 requests/minute per IP |
| AI Services | 20 requests/minute per user |
| Auth OTP | 10 requests/minute per IP |
| Per-email OTP | 5 requests/hour per email per type |

Rate limit information is returned in response headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the window |
| `X-RateLimit-Remaining` | Remaining requests in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the rate limit resets |
| `Retry-After` | Seconds to wait before retrying (only on 429) |

When rate limited, the API returns HTTP `429 Too Many Requests`:

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "limit_type": "minute",
  "retry_after": 60
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent JSON format:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_ERROR_CODE"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request - Invalid parameters |
| `401` | Unauthorized - Missing or invalid authentication |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource does not exist |
| `405` | Method Not Allowed |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error |

### Common Error Codes

| Code | Description |
|------|-------------|
| `MISSING_API_KEY` | No API key or authorization token provided |
| `INVALID_API_KEY` | API key is not valid |
| `INACTIVE_API_KEY` | API key has been deactivated |
| `EXPIRED_API_KEY` | API key has expired |
| `INSUFFICIENT_SCOPE` | API key lacks required permission |
| `IP_NOT_WHITELISTED` | Client IP is not in the API key whitelist |
| `RATE_LIMIT_EXCEEDED` | Too many requests in the time window |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Projects

### 1. GET /api/projects - List Projects

Retrieve all projects for the authenticated user's company.

**Auth**: Bearer JWT or API key with `projects:read` scope
**Roles**: All authenticated roles

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (`active`, `completed`, `on_hold`, `cancelled`) |
| `project_manager_id` | uuid | Filter by project manager |

#### Response

```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Office Tower Renovation",
      "status": "active",
      "budget": 250000.00,
      "start_date": "2026-03-01",
      "end_date": "2026-09-30",
      "completion_percentage": 35,
      "client_name": "Acme Corp",
      "client_email": "contact@acme.com",
      "description": "Full interior renovation of 3-story office building",
      "project_type": "commercial_renovation",
      "site_address": "123 Main St, Springfield, IL",
      "project_manager_id": "uuid",
      "estimated_hours": 4800,
      "actual_hours": 1680,
      "profit_margin": 18.5,
      "total_budget": 250000.00,
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-02-20T14:22:00Z"
    }
  ]
}
```

#### curl Example

```bash
curl -X GET "https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/api-management/api/projects" \
  -H "x-api-key: bd_live_abc123def456..." \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

---

### 2. POST /api/projects - Create Project

Create a new construction project.

**Auth**: Bearer JWT
**Roles**: `admin`, `project_manager`, `root_admin`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project name |
| `description` | string | No | Project description |
| `client_name` | string | No | Client name |
| `client_email` | string | No | Client email |
| `budget` | number | No | Project budget |
| `total_budget` | number | No | Total project budget |
| `start_date` | string (date) | No | Project start date |
| `end_date` | string (date) | No | Project end date |
| `project_type` | string | No | Type: `residential_new`, `residential_renovation`, `commercial_new`, `commercial_renovation`, `industrial`, `multi_family` |
| `site_address` | string | No | Job site address |
| `site_latitude` | number | No | Site latitude coordinate |
| `site_longitude` | number | No | Site longitude coordinate |
| `geofence_radius_meters` | number | No | Geofence radius for GPS tracking |
| `project_manager_id` | uuid | No | Assigned project manager (defaults to creator) |
| `estimated_hours` | number | No | Estimated total hours |
| `permit_numbers` | string[] | No | Permit number references |

#### Response (201 Created)

```json
{
  "project": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "New Office Tower",
    "status": "active",
    "budget": 500000.00,
    "company_id": "uuid",
    "created_by": "uuid",
    "project_manager_id": "uuid",
    "created_at": "2026-02-25T12:00:00Z",
    "updated_at": "2026-02-25T12:00:00Z"
  }
}
```

#### curl Example

```bash
curl -X POST "https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/projects/create" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Office Tower",
    "description": "12-story commercial office building",
    "client_name": "Acme Corp",
    "budget": 500000,
    "start_date": "2026-04-01",
    "end_date": "2027-03-31",
    "project_type": "commercial_new",
    "site_address": "456 Oak Ave, Springfield, IL"
  }'
```

---

### 3. GET /api/projects/:id - Get Project Detail

Retrieve a single project with full details including phases, tasks, job costs, change orders, documents, and daily reports.

**Auth**: Bearer JWT
**Roles**: All authenticated roles (filtered by company)

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Project ID |

#### Response

```json
{
  "project": {
    "id": "uuid",
    "name": "Office Tower Renovation",
    "status": "active",
    "budget": 250000.00,
    "completion_percentage": 35,
    "project_phases": [
      {
        "id": "uuid",
        "name": "Foundation",
        "status": "completed",
        "start_date": "2026-03-01",
        "end_date": "2026-04-15"
      }
    ],
    "tasks": [
      {
        "id": "uuid",
        "name": "Excavation",
        "status": "completed"
      }
    ],
    "job_costs": [
      {
        "id": "uuid",
        "category": "materials",
        "amount": 45000.00
      }
    ],
    "change_orders": [
      {
        "id": "uuid",
        "description": "Additional electrical outlets",
        "amount": 5200.00,
        "status": "approved"
      }
    ],
    "documents": [],
    "daily_reports": []
  }
}
```

---

### 4. PUT /api/projects/:id - Update Project

Update an existing project.

**Auth**: Bearer JWT
**Roles**: `admin`, `project_manager`, `root_admin`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Project ID |

#### Request Body

Any subset of the fields from the Create Project request body. Only provided fields will be updated.

```json
{
  "status": "on_hold",
  "completion_percentage": 50,
  "budget": 275000.00
}
```

#### Response

```json
{
  "project": {
    "id": "uuid",
    "name": "Office Tower Renovation",
    "status": "on_hold",
    "completion_percentage": 50,
    "budget": 275000.00,
    "updated_at": "2026-02-25T15:30:00Z"
  }
}
```

---

### 5. DELETE /api/projects/:id - Delete Project

Permanently delete a project. This action cannot be undone.

**Auth**: Bearer JWT
**Roles**: `admin`, `root_admin`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Project ID |

#### Response

```json
{
  "success": true
}
```

---

## Estimates

### 6. GET /api/estimates - List Estimates

Retrieve all estimates for the authenticated user's company.

**Auth**: Bearer JWT or API key with `estimates:read` scope
**Roles**: All authenticated roles

#### Response

```json
{
  "estimates": [
    {
      "id": "uuid",
      "estimate_number": "EST-2026-0042",
      "title": "Office Renovation Estimate",
      "client_name": "Acme Corp",
      "client_email": "contact@acme.com",
      "total_amount": 185000.00,
      "status": "sent",
      "estimate_date": "2026-02-20",
      "valid_until": "2026-03-20",
      "description": "Complete interior renovation estimate",
      "markup_percentage": 20.0,
      "tax_percentage": 8.25,
      "discount_amount": 0,
      "version_number": 1,
      "is_current_version": true,
      "created_at": "2026-02-20T09:15:00Z"
    }
  ]
}
```

#### curl Example

```bash
curl -X GET "https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/api-management/api/estimates" \
  -H "x-api-key: bd_live_abc123def456..." \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

---

### 7. POST /api/estimates - Create Estimate

Create a new project estimate.

**Auth**: Bearer JWT
**Roles**: `admin`, `project_manager`, `accounting`, `root_admin`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Estimate title |
| `client_name` | string | No | Client name |
| `client_email` | string | No | Client email address |
| `client_phone` | string | No | Client phone number |
| `project_id` | uuid | No | Associated project ID |
| `description` | string | No | Estimate description |
| `estimate_date` | string (date) | Yes | Date of the estimate |
| `valid_until` | string (date) | No | Expiration date |
| `site_address` | string | No | Job site address |
| `markup_percentage` | number | No | Markup percentage |
| `tax_percentage` | number | No | Tax percentage |
| `discount_amount` | number | No | Discount amount |
| `terms_and_conditions` | string | No | Terms and conditions text |
| `notes` | string | No | Internal notes |
| `line_items` | array | No | Array of line items (see below) |

**Line Item Schema**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | Yes | Line item description |
| `quantity` | number | Yes | Quantity |
| `unit_price` | number | Yes | Price per unit |
| `category` | string | No | Category (labor, materials, equipment, subcontractor) |

#### Response (201 Created)

```json
{
  "estimate": {
    "id": "uuid",
    "estimate_number": "EST-2026-0043",
    "title": "Parking Garage Repair",
    "total_amount": 95000.00,
    "status": "draft",
    "created_at": "2026-02-25T12:00:00Z"
  }
}
```

---

### 8. GET /api/estimates/:id - Get Estimate Detail

Retrieve a single estimate with full details including line items.

**Auth**: Bearer JWT
**Roles**: All authenticated roles

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Estimate ID |

#### Response

```json
{
  "estimate": {
    "id": "uuid",
    "estimate_number": "EST-2026-0042",
    "title": "Office Renovation Estimate",
    "client_name": "Acme Corp",
    "total_amount": 185000.00,
    "status": "sent",
    "markup_percentage": 20.0,
    "tax_percentage": 8.25,
    "line_items": [
      {
        "id": "uuid",
        "description": "Demolition and cleanup",
        "quantity": 1,
        "unit_price": 15000.00,
        "total": 15000.00,
        "category": "labor"
      }
    ]
  }
}
```

---

### 9. PUT /api/estimates/:id - Update Estimate

Update an existing estimate.

**Auth**: Bearer JWT
**Roles**: `admin`, `project_manager`, `accounting`, `root_admin`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Estimate ID |

#### Request Body

Any subset of the fields from the Create Estimate request body.

```json
{
  "status": "accepted",
  "accepted_date": "2026-02-25",
  "markup_percentage": 22.0
}
```

#### Response

```json
{
  "estimate": {
    "id": "uuid",
    "estimate_number": "EST-2026-0042",
    "status": "accepted",
    "accepted_date": "2026-02-25",
    "updated_at": "2026-02-25T16:00:00Z"
  }
}
```

---

## Invoices

### 10. GET /api/invoices - List Invoices

Retrieve all invoices for the authenticated user's company.

**Auth**: Bearer JWT or API key with `invoices:read` scope
**Roles**: All authenticated roles

#### Response

```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-2026-0018",
      "client_name": "Acme Corp",
      "client_email": "billing@acme.com",
      "total_amount": 45000.00,
      "subtotal": 41500.00,
      "tax_amount": 3500.00,
      "amount_paid": 0,
      "amount_due": 45000.00,
      "status": "sent",
      "due_date": "2026-03-15",
      "issue_date": "2026-02-15",
      "invoice_type": "progress",
      "progress_percentage": 40,
      "retention_percentage": 10,
      "retention_amount": 4500.00,
      "created_at": "2026-02-15T10:00:00Z"
    }
  ]
}
```

#### curl Example

```bash
curl -X GET "https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/api-management/api/invoices" \
  -H "x-api-key: bd_live_abc123def456..." \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

---

### 11. POST /api/invoices - Create Invoice

Create a new invoice with line items.

**Auth**: Bearer JWT
**Roles**: `admin`, `accounting`, `project_manager`, `root_admin`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_name` | string | Yes | Client name |
| `client_email` | string | Yes | Client email |
| `client_address` | string | No | Client mailing address |
| `project_id` | uuid | No | Associated project ID |
| `due_date` | string (date) | Yes | Payment due date |
| `line_items` | array | Yes | Invoice line items (see below) |
| `tax_rate` | number | No | Tax rate percentage (default: 0) |
| `discount_amount` | number | No | Discount amount (default: 0) |
| `notes` | string | No | Invoice notes |
| `terms` | string | No | Payment terms |
| `invoice_type` | string | No | Type: `standard`, `progress`, `final`, `retention` |
| `retention_percentage` | number | No | Retention percentage |
| `po_number` | string | No | Purchase order number |

**Line Item Schema**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | Yes | Line item description |
| `quantity` | number | Yes | Quantity |
| `unit_price` | number | Yes | Price per unit |
| `cost_code_id` | uuid | No | Associated cost code |
| `project_phase_id` | uuid | No | Associated project phase |

#### Response (201 Created)

```json
{
  "invoice": {
    "id": "uuid",
    "invoice_number": "INV-2026-0019",
    "client_name": "Acme Corp",
    "total_amount": 52000.00,
    "subtotal": 48000.00,
    "tax_amount": 4000.00,
    "status": "draft",
    "created_at": "2026-02-25T12:00:00Z"
  }
}
```

#### curl Example

```bash
curl -X POST "https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/generate-invoice" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Acme Corp",
    "client_email": "billing@acme.com",
    "due_date": "2026-03-25",
    "tax_rate": 8.25,
    "line_items": [
      {
        "description": "Foundation work - Phase 1",
        "quantity": 1,
        "unit_price": 48000
      }
    ],
    "notes": "Net 30 payment terms apply"
  }'
```

---

### 12. GET /api/invoices/:id - Get Invoice Detail

Retrieve a single invoice with full details including line items and payment history.

**Auth**: Bearer JWT
**Roles**: All authenticated roles

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Invoice ID |

#### Response

```json
{
  "invoice": {
    "id": "uuid",
    "invoice_number": "INV-2026-0018",
    "client_name": "Acme Corp",
    "total_amount": 45000.00,
    "status": "sent",
    "line_items": [
      {
        "id": "uuid",
        "description": "Electrical rough-in",
        "quantity": 1,
        "unit_price": 22000.00,
        "total": 22000.00
      }
    ],
    "payments": []
  }
}
```

---

### 13. PUT /api/invoices/:id - Update Invoice

Update an existing invoice (only available for `draft` and `sent` statuses).

**Auth**: Bearer JWT
**Roles**: `admin`, `accounting`, `root_admin`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Invoice ID |

#### Request Body

Any subset of the fields from the Create Invoice request body.

```json
{
  "status": "sent",
  "sent_at": "2026-02-25T12:00:00Z",
  "notes": "Updated payment terms"
}
```

#### Response

```json
{
  "invoice": {
    "id": "uuid",
    "invoice_number": "INV-2026-0018",
    "status": "sent",
    "updated_at": "2026-02-25T15:30:00Z"
  }
}
```

---

## Time Tracking

### 14. GET /api/time-entries - List Time Entries

Retrieve time entries for the authenticated user. Includes related project, task, and cost code data.

**Auth**: Bearer JWT
**Roles**: All authenticated roles

#### Response

```json
{
  "timeEntries": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "project_id": "uuid",
      "task_id": "uuid",
      "cost_code_id": "uuid",
      "start_time": "2026-02-25T08:00:00Z",
      "end_time": "2026-02-25T16:30:00Z",
      "total_hours": 8.5,
      "break_duration": 30,
      "description": "Framing work on second floor",
      "location": "123 Main St",
      "gps_latitude": 39.7817,
      "gps_longitude": -89.6501,
      "is_geofence_verified": true,
      "approval_status": "approved",
      "projects": { "name": "Office Tower Renovation" },
      "tasks": { "name": "Framing" },
      "cost_codes": { "code": "03-100", "name": "Concrete Formwork" },
      "created_at": "2026-02-25T08:00:00Z"
    }
  ]
}
```

#### curl Example

```bash
curl -X GET "https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/time-tracking/entries" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

---

### 15. POST /api/time-entries - Create Time Entry (Clock In)

Start a new time entry (clock in). Only one active time entry is allowed per user at a time.

**Auth**: Bearer JWT
**Roles**: All authenticated roles

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_id` | uuid | Yes | Project to clock into |
| `task_id` | uuid | No | Associated task |
| `cost_code_id` | uuid | No | Cost code for job costing |
| `description` | string | No | Work description |
| `location` | string | No | Location name |
| `gps_latitude` | number | No | GPS latitude |
| `gps_longitude` | number | No | GPS longitude |
| `geofence_id` | uuid | No | Geofence to verify against |

#### Response (201 Created)

```json
{
  "timeEntry": {
    "id": "uuid",
    "user_id": "uuid",
    "project_id": "uuid",
    "start_time": "2026-02-25T08:00:00Z",
    "end_time": null,
    "total_hours": null,
    "projects": { "name": "Office Tower Renovation" },
    "tasks": null,
    "cost_codes": null
  }
}
```

#### curl Example

```bash
curl -X POST "https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/time-tracking/start" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "description": "Framing work on second floor",
    "gps_latitude": 39.7817,
    "gps_longitude": -89.6501
  }'
```

---

### 15b. POST /api/time-entries/stop - Stop Time Entry (Clock Out)

Stop an active time entry (clock out). Automatically calculates total hours.

**Auth**: Bearer JWT
**Roles**: All authenticated roles

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entryId` | uuid | Yes | ID of the active time entry to stop |

#### Response

```json
{
  "timeEntry": {
    "id": "uuid",
    "start_time": "2026-02-25T08:00:00Z",
    "end_time": "2026-02-25T16:30:00Z",
    "total_hours": 8.0,
    "projects": { "name": "Office Tower Renovation" }
  }
}
```

---

## Financial Records

### 16. GET /api/financial-records - List Financial Records

Retrieve financial records (job costs, expenses, revenue) for the authenticated user's company.

**Auth**: Bearer JWT
**Roles**: `admin`, `accounting`, `project_manager`, `root_admin`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `project_id` | uuid | Filter by project |
| `category` | string | Filter by category (`labor`, `materials`, `equipment`, `subcontractor`, `overhead`) |
| `date_from` | string (date) | Start date filter |
| `date_to` | string (date) | End date filter |

#### Response

```json
{
  "financialRecords": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "category": "materials",
      "description": "Lumber delivery - framing materials",
      "amount": 12500.00,
      "record_type": "expense",
      "vendor_name": "Springfield Lumber Co.",
      "cost_code_id": "uuid",
      "date": "2026-02-20",
      "receipt_url": "https://storage.example.com/receipts/receipt-123.pdf",
      "created_at": "2026-02-20T14:00:00Z"
    }
  ]
}
```

---

### 17. POST /api/financial-records - Create Financial Record

Create a new financial record for job costing.

**Auth**: Bearer JWT
**Roles**: `admin`, `accounting`, `project_manager`, `root_admin`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_id` | uuid | Yes | Associated project |
| `category` | string | Yes | Category: `labor`, `materials`, `equipment`, `subcontractor`, `overhead` |
| `description` | string | Yes | Description of the cost |
| `amount` | number | Yes | Cost amount |
| `record_type` | string | Yes | Type: `expense`, `revenue`, `budget` |
| `vendor_name` | string | No | Vendor or supplier name |
| `cost_code_id` | uuid | No | Cost code reference |
| `date` | string (date) | No | Record date (defaults to today) |
| `receipt_url` | string | No | URL to receipt/document |
| `notes` | string | No | Additional notes |

#### Response (201 Created)

```json
{
  "financialRecord": {
    "id": "uuid",
    "project_id": "uuid",
    "category": "materials",
    "amount": 12500.00,
    "record_type": "expense",
    "created_at": "2026-02-25T12:00:00Z"
  }
}
```

---

## Documents

### 18. GET /api/documents - List Documents

Retrieve documents for the authenticated user's company. Supports filtering by project and category.

**Auth**: Bearer JWT
**Roles**: All authenticated roles

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `project_id` | uuid | Filter by project |
| `category_id` | uuid | Filter by category |
| `file_type` | string | Filter by file type (e.g., `pdf`, `image`, `spreadsheet`) |

#### Response

```json
{
  "documents": [
    {
      "id": "uuid",
      "name": "Site_Plans_Rev3.pdf",
      "description": "Updated site plans with electrical layout",
      "file_path": "/documents/projects/uuid/Site_Plans_Rev3.pdf",
      "file_size": 2456789,
      "file_type": "application/pdf",
      "category_id": "uuid",
      "project_id": "uuid",
      "is_current_version": true,
      "version_number": 3,
      "ai_classification": { "type": "blueprint", "confidence": 0.94 },
      "ocr_text": null,
      "uploaded_by": "uuid",
      "created_at": "2026-02-20T11:00:00Z"
    }
  ]
}
```

---

### 19. POST /api/documents - Upload Document

Upload a new document. The file should be uploaded to Supabase Storage first, then the document record is created via this endpoint.

**Auth**: Bearer JWT
**Roles**: All authenticated roles

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Document name |
| `description` | string | No | Document description |
| `file_path` | string | Yes | Storage path from Supabase Storage upload |
| `file_size` | number | No | File size in bytes |
| `file_type` | string | No | MIME type |
| `project_id` | uuid | No | Associated project |
| `category_id` | uuid | No | Document category |
| `tags` | string[] | No | Document tags |

#### Response (201 Created)

```json
{
  "document": {
    "id": "uuid",
    "name": "Site_Plans_Rev3.pdf",
    "file_path": "/documents/projects/uuid/Site_Plans_Rev3.pdf",
    "is_current_version": true,
    "version_number": 1,
    "created_at": "2026-02-25T12:00:00Z"
  }
}
```

---

## Team Members

### 20. GET /api/team-members - List Team Members

Retrieve all team members (user profiles) in the authenticated user's company.

**Auth**: Bearer JWT
**Roles**: `admin`, `project_manager`, `office_staff`, `root_admin`

#### Response

```json
{
  "teamMembers": [
    {
      "id": "uuid",
      "email": "john.doe@company.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "project_manager",
      "phone": "+1-555-123-4567",
      "avatar_url": "https://storage.example.com/avatars/uuid.jpg",
      "is_active": true,
      "last_login": "2026-02-25T08:30:00Z",
      "created_at": "2025-06-15T10:00:00Z"
    }
  ]
}
```

---

### 21. POST /api/team-members/invite - Invite Team Member

Invite a new team member to the company. Sends an OTP-based invitation email.

**Auth**: Bearer JWT
**Roles**: `admin`, `root_admin`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Email address to invite |
| `first_name` | string | No | First name |
| `last_name` | string | No | Last name |
| `role` | string | No | Assigned role: `admin`, `project_manager`, `field_supervisor`, `office_staff`, `accounting`, `client_portal` (default: `office_staff`) |

#### Response

```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "expiresInMinutes": 60
}
```

#### curl Example

```bash
curl -X POST "https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/send-auth-otp" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.smith@company.com",
    "type": "invite_user",
    "recipientName": "Jane Smith",
    "inviterName": "John Doe",
    "companyName": "Acme Construction",
    "metadata": {
      "role": "project_manager",
      "first_name": "Jane",
      "last_name": "Smith"
    }
  }'
```

---

## CRM - Contacts

### 22. GET /api/crm/contacts - List CRM Contacts

Retrieve all CRM contacts for the authenticated user's company.

**Auth**: Bearer JWT
**Roles**: `admin`, `project_manager`, `office_staff`, `root_admin`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by contact type (`client`, `vendor`, `subcontractor`, `other`) |
| `search` | string | Search by name or email |

#### Response

```json
{
  "contacts": [
    {
      "id": "uuid",
      "first_name": "Robert",
      "last_name": "Johnson",
      "email": "rjohnson@acmecorp.com",
      "phone": "+1-555-987-6543",
      "company_name": "Acme Corp",
      "title": "VP of Facilities",
      "contact_type": "client",
      "address": "789 Corporate Dr, Springfield, IL",
      "notes": "Prefers email communication",
      "tags": ["vip", "repeat-client"],
      "last_contacted_at": "2026-02-20T14:00:00Z",
      "created_at": "2025-09-10T10:00:00Z"
    }
  ]
}
```

---

### 23. POST /api/crm/contacts - Create Contact

Create a new CRM contact.

**Auth**: Bearer JWT
**Roles**: `admin`, `project_manager`, `office_staff`, `root_admin`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | string | Yes | First name |
| `last_name` | string | Yes | Last name |
| `email` | string | No | Email address |
| `phone` | string | No | Phone number |
| `company_name` | string | No | Company or organization |
| `title` | string | No | Job title |
| `contact_type` | string | No | Type: `client`, `vendor`, `subcontractor`, `other` |
| `address` | string | No | Mailing address |
| `notes` | string | No | Internal notes |
| `tags` | string[] | No | Tags for categorization |

#### Response (201 Created)

```json
{
  "contact": {
    "id": "uuid",
    "first_name": "Robert",
    "last_name": "Johnson",
    "email": "rjohnson@acmecorp.com",
    "contact_type": "client",
    "created_at": "2026-02-25T12:00:00Z"
  }
}
```

---

## CRM - Leads

### 24. GET /api/crm/leads - List Leads

Retrieve all leads in the sales pipeline for the authenticated user's company.

**Auth**: Bearer JWT
**Roles**: `admin`, `project_manager`, `office_staff`, `root_admin`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (`new`, `contacted`, `qualified`, `proposal`, `negotiation`, `won`, `lost`) |
| `assigned_to` | uuid | Filter by assigned team member |

#### Response

```json
{
  "leads": [
    {
      "id": "uuid",
      "name": "Downtown Loft Conversion",
      "contact_name": "Sarah Williams",
      "contact_email": "swilliams@example.com",
      "contact_phone": "+1-555-222-3333",
      "status": "qualified",
      "source": "referral",
      "estimated_value": 320000.00,
      "probability": 60,
      "expected_close_date": "2026-04-15",
      "assigned_to": "uuid",
      "notes": "Interested in eco-friendly materials",
      "score": 78,
      "created_at": "2026-02-10T09:00:00Z"
    }
  ]
}
```

---

### 25. POST /api/crm/leads - Create Lead

Create a new lead in the sales pipeline.

**Auth**: Bearer JWT
**Roles**: `admin`, `project_manager`, `office_staff`, `root_admin`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Lead/opportunity name |
| `contact_name` | string | No | Contact name |
| `contact_email` | string | No | Contact email |
| `contact_phone` | string | No | Contact phone |
| `status` | string | No | Status (default: `new`) |
| `source` | string | No | Lead source: `website`, `referral`, `cold_call`, `advertising`, `trade_show`, `other` |
| `estimated_value` | number | No | Estimated project value |
| `probability` | number | No | Win probability percentage (0-100) |
| `expected_close_date` | string (date) | No | Expected close date |
| `assigned_to` | uuid | No | Team member to assign |
| `notes` | string | No | Additional notes |

#### Response (201 Created)

```json
{
  "lead": {
    "id": "uuid",
    "name": "Downtown Loft Conversion",
    "status": "new",
    "estimated_value": 320000.00,
    "created_at": "2026-02-25T12:00:00Z"
  }
}
```

---

## AI Services

### 26. POST /api/ai/content - Generate AI Content

Generate AI-powered content for blogs, social media, or custom prompts. Uses configurable AI models.

**Auth**: Bearer JWT
**Roles**: All authenticated roles
**Rate Limit**: 20 requests/minute per user

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | The content generation prompt |
| `system_prompt` | string | No | Custom system prompt for the AI model |
| `content_type` | string | No | Type: `blog`, `social`, `general` (default: `general`) |
| `model_alias` | string | No | AI model alias (default: platform default) |

#### Response

```json
{
  "success": true,
  "content": "Generated content text or structured object...",
  "model_used": "claude-haiku"
}
```

For `social` content type, the content is an array:

```json
{
  "success": true,
  "content": [
    { "platform": "linkedin", "content": "Professional post with hashtags..." },
    { "platform": "twitter", "content": "Concise tweet under 280 chars..." },
    { "platform": "facebook", "content": "Engaging Facebook post..." }
  ],
  "model_used": "claude-haiku"
}
```

#### curl Example

```bash
curl -X POST "https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/ai-content-generator" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a blog post about the benefits of GPS time tracking for construction crews",
    "content_type": "blog"
  }'
```

---

### 27. POST /api/ai/estimate - Generate AI Estimate

Generate an AI-powered cost estimate using historical project data, market pricing, and ML predictions.

**Auth**: Bearer JWT
**Roles**: All authenticated roles
**Rate Limit**: 20 requests/minute per user

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_name` | string | Yes | Name for the estimate |
| `project_type` | string | Yes | Type: `residential_new`, `residential_renovation`, `commercial_new`, `commercial_renovation`, `industrial`, `multi_family` |
| `square_footage` | number | Yes | Total square footage |
| `location_zip` | string | Yes | ZIP code for location-based pricing |
| `estimated_duration_days` | number | No | Estimated project duration (default: 30) |

#### Response

```json
{
  "estimate": {
    "id": "uuid",
    "estimate_name": "New Office Building",
    "predictions": {
      "labor_hours": 2133.3,
      "labor_cost": 96000.00,
      "material_cost": 84000.00,
      "equipment_cost": 24000.00,
      "subcontractor_cost": 36000.00,
      "total_cost": 240000.00
    },
    "recommendations": {
      "markup_percentage": 18.5,
      "bid_amount": 284400.00,
      "win_probability": 55.0
    },
    "confidence": {
      "score": 72.5,
      "similar_projects": 8,
      "data_quality": "medium"
    },
    "line_items": [
      {
        "category": "labor",
        "item_name": "General Labor",
        "item_description": "Skilled and unskilled labor",
        "predicted_quantity": 1280.0,
        "predicted_unit_cost": 35.0,
        "predicted_total_cost": 57600.00,
        "confidence_score": 70.0,
        "prediction_model": "weighted_average"
      },
      {
        "category": "labor",
        "item_name": "Specialized Labor",
        "item_description": "Electricians, plumbers, HVAC techs",
        "predicted_quantity": 853.3,
        "predicted_unit_cost": 65.0,
        "predicted_total_cost": 38400.00,
        "confidence_score": 65.0,
        "prediction_model": "weighted_average"
      },
      {
        "category": "materials",
        "item_name": "Primary Materials",
        "item_description": "Lumber, concrete, steel",
        "predicted_quantity": 2000,
        "predicted_unit_cost": 25.20,
        "predicted_total_cost": 50400.00,
        "confidence_score": 75.0,
        "prediction_model": "market_pricing"
      }
    ]
  }
}
```

#### curl Example

```bash
curl -X POST "https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/ai-estimating" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "New Office Building",
    "project_type": "commercial_new",
    "square_footage": 2000,
    "location_zip": "62701",
    "estimated_duration_days": 120
  }'
```

---

## API Key Management

### 28. POST /api/management/validate-key - Validate API Key

Validate an API key and return its associated permissions and company.

**Auth**: API key via `x-api-key` header

#### Request

No request body required. The API key is provided in the `x-api-key` header.

#### Response

```json
{
  "valid": true,
  "company_id": "uuid",
  "permissions": ["projects:read", "estimates:read", "invoices:read"],
  "rate_limit": 1000
}
```

#### Error Response (401)

```json
{
  "error": "Invalid API key"
}
```

#### curl Example

```bash
curl -X POST "https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/api-management/validate-key" \
  -H "x-api-key: bd_live_abc123def456..." \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

---

### 29. POST /api/management/create-key - Create API Key

Create a new API key for external integrations. Only available to admin users. The full API key is returned only once during creation.

**Auth**: Bearer JWT
**Roles**: `admin`, `root_admin`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key_name` | string | Yes | Friendly name for the API key |
| `permissions` | string[] | No | Permission scopes (default: `[]`) |
| `expires_at` | string (datetime) | No | Expiration date (null for no expiry) |
| `rate_limit_per_hour` | number | No | Hourly rate limit (default: 1000) |

#### Response

```json
{
  "id": "uuid",
  "key_name": "Production Integration",
  "api_key": "bd_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "api_key_prefix": "bd_live_a1b2...",
  "permissions": ["projects:read", "estimates:read"],
  "expires_at": "2027-02-25T00:00:00Z",
  "rate_limit_per_hour": 1000,
  "created_at": "2026-02-25T12:00:00Z"
}
```

> **Important**: The `api_key` field contains the full API key and is only returned during creation. Store it securely -- it cannot be retrieved again.

#### curl Example

```bash
curl -X POST "https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/api-management/create-key" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key_name": "Production Integration",
    "permissions": ["projects:read", "estimates:read", "invoices:read"],
    "expires_at": "2027-02-25T00:00:00Z",
    "rate_limit_per_hour": 500
  }'
```

---

## Webhooks

### 30. POST /api/webhooks/subscribe - Subscribe to Webhook

Create a webhook endpoint to receive real-time event notifications.

**Auth**: Bearer JWT
**Roles**: `admin`, `root_admin`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string (URL) | Yes | The HTTPS URL to receive webhook payloads |
| `endpoint_name` | string | No | Friendly name for the endpoint |
| `description` | string | No | Endpoint description |
| `subscribed_events` | string[] | Yes | Event types to subscribe to |
| `secret` | string | Yes | Secret for webhook signature verification |
| `max_retries` | number | No | Maximum retry attempts (default: 3) |
| `timeout_seconds` | number | No | Delivery timeout in seconds (default: 30) |
| `auto_disable_after_failures` | number | No | Disable after N consecutive failures (default: 10) |

**Available Event Types**:

| Event | Description |
|-------|-------------|
| `project.created` | New project created |
| `project.updated` | Project updated |
| `project.deleted` | Project deleted |
| `project.status_changed` | Project status changed |
| `estimate.created` | New estimate created |
| `estimate.sent` | Estimate sent to client |
| `estimate.accepted` | Estimate accepted by client |
| `estimate.rejected` | Estimate rejected by client |
| `invoice.created` | New invoice created |
| `invoice.sent` | Invoice sent to client |
| `invoice.paid` | Invoice payment received |
| `invoice.overdue` | Invoice past due date |
| `time_entry.created` | Time entry started |
| `time_entry.completed` | Time entry stopped |
| `document.uploaded` | New document uploaded |
| `team_member.invited` | Team member invited |
| `team_member.joined` | Team member accepted invitation |
| `change_order.created` | Change order created |
| `change_order.approved` | Change order approved |
| `webhook.test` | Test webhook event |

#### Response (201 Created)

```json
{
  "webhook": {
    "id": "uuid",
    "url": "https://your-server.com/webhooks/brikly",
    "endpoint_name": "Production Webhook",
    "subscribed_events": ["project.created", "invoice.paid"],
    "is_active": true,
    "created_at": "2026-02-25T12:00:00Z"
  }
}
```

### Webhook Payload Format

When an event occurs, Brikly sends a POST request to your endpoint:

```json
{
  "event": "project.created",
  "timestamp": "2026-02-25T12:00:00Z",
  "data": {
    "id": "uuid",
    "name": "New Construction Project",
    "status": "active"
  }
}
```

### Webhook Security

Each delivery includes a signature header for verification:

```
X-Webhook-Signature: sha256=abc123def456...
```

Verify the signature by computing HMAC-SHA256 of the request body using your webhook secret:

```javascript
const crypto = require('crypto');
const expectedSignature = 'sha256=' + crypto
  .createHmac('sha256', webhookSecret)
  .update(requestBody)
  .digest('hex');

if (expectedSignature === req.headers['x-webhook-signature']) {
  // Signature is valid
}
```

---

## Auth OTP

### 31. POST /api/auth/send-otp - Send OTP Code

Send a one-time password (OTP) code for authentication flows. Supports signup confirmation, password reset, magic links, email changes, invitations, and reauthentication.

**Auth**: None required (public endpoint)
**Rate Limit**: 10 requests/minute per IP; 5 requests/hour per email per type

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Recipient email address |
| `type` | string | Yes | OTP type (see below) |
| `recipientName` | string | No | Recipient display name |
| `newEmail` | string | No | New email (for `change_email` type) |
| `inviterName` | string | No | Inviter name (for `invite_user` type) |
| `inviterUserId` | uuid | No | Inviter user ID (for `invite_user` type) |
| `companyId` | uuid | No | Company ID (for `invite_user` type) |
| `companyName` | string | No | Company name (for `invite_user` type) |
| `metadata` | object | No | Additional metadata |

**OTP Types**:

| Type | Description | Expiration |
|------|-------------|------------|
| `confirm_signup` | Email verification for new signups | 15 minutes |
| `invite_user` | Team member invitation | 60 minutes |
| `magic_link` | Passwordless sign-in | 10 minutes |
| `change_email` | Email address change | 15 minutes |
| `reset_password` | Password reset | 10 minutes |
| `reauthentication` | Re-verify identity for sensitive actions | 5 minutes |

#### Response

```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "expiresInMinutes": 15
}
```

---

### 32. POST /api/auth/verify-otp - Verify OTP Code

Verify an OTP code and perform the associated authentication action (confirm email, accept invite, reset password, etc.).

**Auth**: None required (public endpoint)
**Rate Limit**: 10 requests/minute per IP

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Email address the OTP was sent to |
| `otpCode` | string | Yes | 6-digit OTP code |
| `type` | string | Yes | OTP type (must match the `send-otp` request type) |
| `password` | string | Conditional | Password for `confirm_signup`, `invite_user`, or `reset_password` flows (min 8 characters) |
| `firstName` | string | No | First name (for `invite_user` type) |
| `lastName` | string | No | Last name (for `invite_user` type) |

#### Response (varies by type)

**For `confirm_signup`**:
```json
{
  "success": true,
  "verified": true,
  "emailConfirmed": true,
  "userId": "uuid"
}
```

**For `invite_user`**:
```json
{
  "success": true,
  "verified": true,
  "userCreated": true,
  "userId": "uuid",
  "companyId": "uuid"
}
```

**For `magic_link`**:
```json
{
  "success": true,
  "verified": true,
  "userId": "uuid",
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**For `reset_password`**:
```json
{
  "success": true,
  "verified": true,
  "passwordReset": true,
  "userId": "uuid"
}
```

**For `reauthentication`**:
```json
{
  "success": true,
  "verified": true,
  "reauthenticated": true,
  "tokenId": "uuid"
}
```

---

## Data Types Reference

### Project

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Unique identifier |
| `name` | string | Project name |
| `description` | string | Project description |
| `status` | string | `active`, `completed`, `on_hold`, `cancelled` |
| `budget` | number | Project budget |
| `total_budget` | number | Total project budget |
| `start_date` | string (date) | Project start date |
| `end_date` | string (date) | Project end date |
| `completion_percentage` | number | Completion percentage (0-100) |
| `client_name` | string | Client name |
| `client_email` | string | Client email |
| `project_type` | string | Project type classification |
| `site_address` | string | Job site address |
| `site_latitude` | number | Site GPS latitude |
| `site_longitude` | number | Site GPS longitude |
| `geofence_radius_meters` | number | Geofence radius |
| `project_manager_id` | uuid | Assigned project manager |
| `estimated_hours` | number | Estimated total hours |
| `actual_hours` | number | Actual hours tracked |
| `profit_margin` | number | Current profit margin |
| `permit_numbers` | string[] | Permit references |
| `company_id` | uuid | Owning company |
| `created_by` | uuid | Creator user ID |
| `created_at` | string (datetime) | Creation timestamp |
| `updated_at` | string (datetime) | Last update timestamp |

### Estimate

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Unique identifier |
| `estimate_number` | string | Auto-generated estimate number |
| `title` | string | Estimate title |
| `client_name` | string | Client name |
| `client_email` | string | Client email |
| `client_phone` | string | Client phone |
| `description` | string | Estimate description |
| `total_amount` | number | Total estimated amount |
| `status` | string | `draft`, `sent`, `accepted`, `rejected`, `expired` |
| `estimate_date` | string (date) | Date of estimate |
| `valid_until` | string (date) | Expiration date |
| `accepted_date` | string (date) | Date accepted |
| `sent_date` | string (date) | Date sent to client |
| `site_address` | string | Job site address |
| `markup_percentage` | number | Markup percentage |
| `tax_percentage` | number | Tax percentage |
| `discount_amount` | number | Discount amount |
| `terms_and_conditions` | string | Terms text |
| `notes` | string | Internal notes |
| `version_number` | number | Version number |
| `is_current_version` | boolean | Whether this is the current version |
| `project_id` | uuid | Linked project |
| `company_id` | uuid | Owning company |
| `created_by` | uuid | Creator user ID |
| `created_at` | string (datetime) | Creation timestamp |
| `updated_at` | string (datetime) | Last update timestamp |

### Invoice

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Unique identifier |
| `invoice_number` | string | Auto-generated invoice number |
| `client_name` | string | Client name |
| `client_email` | string | Client email |
| `client_address` | string | Client address |
| `subtotal` | number | Subtotal before tax |
| `tax_rate` | number | Tax rate percentage |
| `tax_amount` | number | Tax amount |
| `discount_amount` | number | Discount amount |
| `total_amount` | number | Total invoice amount |
| `amount_paid` | number | Amount paid to date |
| `amount_due` | number | Amount remaining |
| `status` | string | `draft`, `sent`, `paid`, `partial`, `overdue`, `cancelled` |
| `invoice_type` | string | `standard`, `progress`, `final`, `retention` |
| `due_date` | string (date) | Payment due date |
| `issue_date` | string (date) | Invoice issue date |
| `paid_at` | string (datetime) | Payment date |
| `sent_at` | string (datetime) | Date sent |
| `progress_percentage` | number | Progress billing percentage |
| `retention_percentage` | number | Retention percentage |
| `retention_amount` | number | Retention amount |
| `po_number` | string | Purchase order number |
| `notes` | string | Invoice notes |
| `terms` | string | Payment terms |
| `project_id` | uuid | Linked project |
| `company_id` | uuid | Owning company |
| `created_by` | uuid | Creator user ID |
| `created_at` | string (datetime) | Creation timestamp |

### TimeEntry

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Unique identifier |
| `user_id` | uuid | Worker user ID |
| `project_id` | uuid | Associated project |
| `task_id` | uuid | Associated task |
| `cost_code_id` | uuid | Cost code for job costing |
| `start_time` | string (datetime) | Clock-in time |
| `end_time` | string (datetime) | Clock-out time (null if active) |
| `total_hours` | number | Total hours worked |
| `break_duration` | number | Break duration in minutes |
| `description` | string | Work description |
| `location` | string | Location name |
| `gps_latitude` | number | GPS latitude |
| `gps_longitude` | number | GPS longitude |
| `is_geofence_verified` | boolean | Whether location was verified by geofence |
| `geofence_distance_meters` | number | Distance from geofence center |
| `approval_status` | string | `pending`, `approved`, `rejected` |
| `approved_by` | uuid | Approver user ID |
| `approved_at` | string (datetime) | Approval timestamp |
| `rejection_reason` | string | Reason for rejection |
| `created_at` | string (datetime) | Creation timestamp |

### Document

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Unique identifier |
| `name` | string | Document name |
| `description` | string | Description |
| `file_path` | string | Storage file path |
| `file_size` | number | File size in bytes |
| `file_type` | string | MIME type |
| `category_id` | uuid | Document category |
| `project_id` | uuid | Associated project |
| `is_current_version` | boolean | Current version flag |
| `version_number` | number | Version number |
| `ai_classification` | object | AI-generated classification |
| `ocr_text` | string | Extracted OCR text |
| `uploaded_by` | uuid | Uploader user ID |
| `company_id` | uuid | Owning company |
| `created_at` | string (datetime) | Creation timestamp |

### UserProfile (Team Member)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Unique identifier (matches auth user ID) |
| `email` | string | Email address |
| `first_name` | string | First name |
| `last_name` | string | Last name |
| `role` | string | `admin`, `project_manager`, `field_supervisor`, `office_staff`, `accounting`, `client_portal` |
| `phone` | string | Phone number |
| `avatar_url` | string | Avatar image URL |
| `is_active` | boolean | Whether account is active |
| `last_login` | string (datetime) | Last login timestamp |
| `company_id` | uuid | Company ID |
| `created_at` | string (datetime) | Creation timestamp |

### WebhookEndpoint

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Unique identifier |
| `url` | string | Webhook delivery URL |
| `endpoint_name` | string | Friendly name |
| `description` | string | Description |
| `subscribed_events` | string[] | Subscribed event types |
| `secret` | string | HMAC signing secret |
| `is_active` | boolean | Whether endpoint is active |
| `is_verified` | boolean | Whether endpoint has been verified |
| `max_retries` | number | Maximum retry attempts |
| `timeout_seconds` | number | Delivery timeout |
| `last_success_at` | string (datetime) | Last successful delivery |
| `last_failure_at` | string (datetime) | Last failed delivery |
| `failure_count` | number | Consecutive failure count |
| `successful_deliveries` | number | Total successful deliveries |
| `failed_deliveries` | number | Total failed deliveries |
| `created_at` | string (datetime) | Creation timestamp |

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sign in
const { data: auth } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'your-password'
});

// List projects via Edge Function
const { data } = await supabase.functions.invoke('projects/list', {
  method: 'GET'
});

// Create a project
const { data: project } = await supabase.functions.invoke('projects/create', {
  body: {
    name: 'New Building',
    budget: 500000,
    project_type: 'commercial_new'
  }
});

// Generate AI estimate
const { data: estimate } = await supabase.functions.invoke('ai-estimating', {
  body: {
    project_name: 'Office Renovation',
    project_type: 'commercial_renovation',
    square_footage: 5000,
    location_zip: '62701'
  }
});
```

### Python

```python
import requests

BASE_URL = "https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1"
headers = {
    "x-api-key": "bd_live_abc123...",
    "apikey": "YOUR_SUPABASE_ANON_KEY",
    "Content-Type": "application/json"
}

# List projects
response = requests.get(f"{BASE_URL}/api-management/api/projects", headers=headers)
projects = response.json()["projects"]

# Create invoice
invoice_data = {
    "client_name": "Acme Corp",
    "client_email": "billing@acme.com",
    "due_date": "2026-03-25",
    "line_items": [
        {"description": "Foundation work", "quantity": 1, "unit_price": 48000}
    ]
}
response = requests.post(f"{BASE_URL}/generate-invoice", json=invoice_data, headers=headers)
```

---

## Changelog

### v1.0.0 (2026-02-25)
- Initial API reference documentation
- 32 endpoints documented across 11 categories
- OpenAPI 3.0 specification available at `docs/api-schema.json`
