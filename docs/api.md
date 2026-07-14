# API Documentation

## Authentication

### POST /api/auth/register

Request:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass123!"
}
```

Response:
```json
{
  "message": "Registration successful. Please verify your email.",
  "user": {
    "id": "...",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

### POST /api/auth/login

Request:
```json
{
  "email": "jane@example.com",
  "password": "SecurePass123!"
}
```

Response:
```json
{
  "message": "Login successful",
  "token": "...",
  "user": {
    "id": "...",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "USER",
    "emailVerified": false
  }
}
```

### GET /api/auth/me

Response:
```json
{
  "user": {
    "id": "...",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "USER",
    "emailVerified": false,
    "settings": { ... },
    "subscriptions": [ ... ]
  }
}
```

### POST /api/auth/logout

Response:
```json
{ "message": "Logged out" }
```

### POST /api/auth/forgot-password

Request:
```json
{ "email": "jane@example.com" }
```

Response:
```json
{ "message": "If the email exists, a reset link was sent." }
```

### POST /api/auth/reset-password

Request:
```json
{ "token": "...", "password": "NewSecurePass123!" }
```

Response:
```json
{ "message": "Password updated successfully" }
```

### POST /api/auth/verify-email

Request:
```json
{ "token": "..." }
```

Response:
```json
{ "message": "Email verified successfully" }
```

## Users

### GET /api/users

Query parameters:
- `page`
- `size`
- `search`
- `role`
- `status`
- `sort`

Response:
```json
{
  "users": [ ... ],
  "pagination": { "page": 1, "size": 10, "total": 42, "pages": 5 }
}
```

### GET /api/users/:id

Response:
```json
{ "user": { ... } }
```

### PATCH /api/users/:id

Request: partial update payload with allowed fields depending on role.

### DELETE /api/users/:id

Requires ADMIN role.

## Plans

### GET /api/plans

Returns available plans.

### POST /api/plans

Requires ADMIN role.

## Subscriptions

### GET /api/subscriptions/me

Returns the authenticated user subscription.

### POST /api/subscriptions/checkout

Request:
```json
{ "planId": "...", "interval": "MONTHLY" }
```

### POST /api/subscriptions/:id/cancel

Cancels a subscription if owned by the user or admin.

## Settings

### GET /api/settings/me

Returns the authenticated user's settings.

### PUT /api/settings/me

Updates theme, notifications, timezone, and language.

## Notifications

### GET /api/notifications

Returns the authenticated user's notifications.

### PATCH /api/notifications/:id/read

Marks a notification read.

## Logs

### GET /api/logs

Requires ADMIN role.

Supports pagination and optional `action` filter.

## Files

### POST /api/files

Multipart form-data upload field: `file`

### GET /api/files

Returns uploaded files for the authenticated user.

### DELETE /api/files/:id

Deletes a file if the user owns it or is an admin.

## Reports

### GET /api/reports/overview

Requires ADMIN role.

### GET /api/reports/export

Exports a CSV of invoices.
