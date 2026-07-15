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
    "organization": { ... },
    "subscriptions": [ ... ]
  }
}
```

### POST /api/auth/logout-all-sessions

Invalidates all active sessions for the current user.

### PUT /api/auth/profile

Updates the authenticated user's profile fields such as name, phone, and avatar URL.

### POST /api/auth/change-password

Request:
```json
{ "currentPassword": "CurrentPass123!", "newPassword": "NewSecurePass123!" }
```

### POST /api/auth/resend-verification

Request:
```json
{ "email": "jane@example.com" }
```

### GET /api/organization/me

Returns the authenticated user's workspace and members.

### PUT /api/organization/me

Updates workspace settings such as organization name, branding, locale, and contact details.

### GET /api/organization/members

Returns workspace members with profile information and roles.

### POST /api/organization/members/invite

Request:
```json
{ "email": "member@example.com", "role": "MEMBER" }
```

### DELETE /api/organization/members/:userId

Removes a member from the workspace.

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

### PATCH /api/notifications/read-all

Marks all notifications as read.

### DELETE /api/notifications/:id

Deletes a notification.

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

### GET /api/files/:id/download

Downloads a file after ownership validation.

## Activity logs

### GET /api/logs/me

Returns the authenticated user's recent activity history.

## Reports

### GET /api/reports/overview

Requires ADMIN role.

### GET /api/reports/export

Exports a CSV of invoices.

## Admin

### GET /api/admin/dashboard

Returns admin metrics, recent activity, and growth data.

### GET /api/admin/users

Supports `page`, `size`, `search`, `status`, and `role`.

### GET /api/admin/users/:id

Returns a detailed user record with subscriptions and activity.

### PATCH /api/admin/users/:id

Updates user profile, role, or status.

### POST /api/admin/users/:id/reset-password

Resets a user's password and invalidates their sessions.

### DELETE /api/admin/users/:id

Deletes a user record.

### GET /api/admin/organizations

Lists all organizations with members and invitations.

### PATCH /api/admin/organizations/:id

Updates organization settings.

### DELETE /api/admin/organizations/:id

Deletes an organization.

### GET /api/admin/roles

Lists all roles and assigned permissions.

### POST /api/admin/roles

Creates a role with optional permission assignments.

### PATCH /api/admin/roles/:id

Updates a role and its permissions.

### DELETE /api/admin/roles/:id

Deletes a role.

### GET /api/admin/permissions

Lists permissions.

### POST /api/admin/permissions

Creates a permission.

### PATCH /api/admin/permissions/:id

Updates a permission.

### DELETE /api/admin/permissions/:id

Deletes a permission.

### GET /api/admin/settings

Returns admin system settings.

### PUT /api/admin/settings

Updates admin system settings.

### GET /api/admin/logs

Returns audit log entries with optional filters.

### GET /api/admin/reports

Returns admin reporting data for users, organizations, activity, and storage.

## Madrassa

All madrassa endpoints are workspace-scoped and require authentication.

### GET /api/madrassa/profile

Returns the madrassa profile for the current workspace.

### PUT /api/madrassa/profile

Creates or updates the madrassa profile.

### GET /api/madrassa/branches

Lists branches for the current madrassa.

### POST /api/madrassa/branches

Creates a branch.

### PATCH /api/madrassa/branches/:id

Updates a branch.

### DELETE /api/madrassa/branches/:id

Soft-deletes a branch.

### GET /api/madrassa/academic-years

Lists academic years.

### POST /api/madrassa/academic-years

Creates an academic year.

### PATCH /api/madrassa/academic-years/:id

Updates an academic year.

### DELETE /api/madrassa/academic-years/:id

Archives an academic year.

### GET /api/madrassa/departments

Lists departments.

### POST /api/madrassa/departments

Creates a department.

### PATCH /api/madrassa/departments/:id

Updates a department.

### DELETE /api/madrassa/departments/:id

Soft-deletes a department.

### GET /api/madrassa/programs

Lists programs.

### POST /api/madrassa/programs

Creates a program.

### PATCH /api/madrassa/programs/:id

Updates a program.

### DELETE /api/madrassa/programs/:id

Soft-deletes a program.

### GET /api/madrassa/classes

Lists classes.

### POST /api/madrassa/classes

Creates a class.

### GET /api/madrassa/sections

Lists sections.

### POST /api/madrassa/sections

Creates a section.

### GET /api/madrassa/subjects

Lists subjects.

### POST /api/madrassa/subjects

Creates a subject.

### GET /api/madrassa/timetable

Lists timetable entries.

### POST /api/madrassa/timetable

Creates a timetable entry.
