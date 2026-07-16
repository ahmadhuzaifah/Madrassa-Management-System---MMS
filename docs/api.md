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

## Students

### GET /api/students

Returns the student directory with search and filters.

### POST /api/students

Creates a student record.

### GET /api/students/:id

Returns a student profile with guardian, documents, and transfers.

### PATCH /api/students/:id

Updates a student.

### DELETE /api/students/:id

Soft-deletes a student.

### POST /api/students/admission

Creates a student admission and generates a registration number.

### GET /api/students/:id/documents

Lists student documents.

### POST /api/students/:id/documents

Adds a student document.

### GET /api/students/:id/transfers

Lists student transfers.

### POST /api/students/:id/transfer

Transfers a student between branches or classes.

## Attendance

### GET /api/attendance

Lists attendance records with optional filters for date, branch, class, and section.

### POST /api/attendance

Marks batch attendance for a class or section and prevents duplicate records for the same student and date.

### PATCH /api/attendance/:id

Updates an attendance record.

### GET /api/attendance/reports/daily

Returns daily attendance records and summary counts.

### GET /api/attendance/reports/monthly

Returns monthly attendance records for reporting.

### GET /api/attendance/student/:id

Returns a student attendance history and summary metrics.

### POST /api/attendance/leaves

Creates a leave request for a student.

### GET /api/attendance/leaves

Lists leave requests for the current workspace.

## Fees

### GET /api/fees/structures

Lists fee structures for the current madrassa.

### POST /api/fees/structures

Creates a fee structure.

### PATCH /api/fees/structures/:id

Updates a fee structure.

### DELETE /api/fees/structures/:id

Deletes a fee structure.

### GET /api/fees/student/:id

Returns a student's fee assignments, payments, invoices, discounts, and balance summary.

### POST /api/fees/student/:id/assign

Assigns a fee structure to a student.

### POST /api/fees/payments

Records a student payment and generates a receipt/invoice.

### GET /api/fees/payments

Lists fee payments for the workspace.

### GET /api/fees/invoices

Lists fee invoices.

### GET /api/fees/invoices/:id

Returns a single invoice.

### GET /api/fees/reports/collection

Returns total collection and payment rows.

### GET /api/fees/reports/outstanding

Returns outstanding dues per student.

## Exams

### GET /api/exams

Lists exams for the current workspace.

### POST /api/exams

Creates an exam.

### PATCH /api/exams/:id

Updates an exam.

### DELETE /api/exams/:id

Deletes an exam.

### GET /api/exams/:id/subjects

Lists subjects attached to an exam.

### POST /api/exams/:id/subjects

Adds a subject with total and passing marks.

### GET /api/exams/:id/results

Lists results for an exam.

### POST /api/exams/:id/results

Saves marks and generates result cards.

### GET /api/exams/student/:id

Returns a student's exam history and cards.

### GET /api/exams/result-card/:studentId/:examId

Returns printable result card data.

### GET /api/exams/reports/class

Returns class result cards for an exam.

### GET /api/exams/reports/subject

Returns subject performance results for an exam.

## Certificates

### GET /api/certificates/templates

Lists certificate templates for the workspace.

### POST /api/certificates/templates

Creates a certificate template.

### PATCH /api/certificates/templates/:id

Updates a certificate template.

### DELETE /api/certificates/templates/:id

Deletes a certificate template.

### GET /api/certificates

Lists certificates for the workspace.

### POST /api/certificates/generate

Generates and stores a certificate for a student.

### GET /api/certificates/:id

Returns certificate details.

### DELETE /api/certificates/:id

Revokes a certificate.

### GET /api/certificates/verify/:code

Public verification endpoint for certificate status.

### GET /api/certificates/student/:id

Lists certificates issued to a student.

## Finance

### GET /api/finance/accounts

Lists finance accounts for the workspace.

### POST /api/finance/accounts

Creates a finance account.

### GET /api/finance/transactions

Lists posted transactions with ledger lines.

### POST /api/finance/transactions

Posts a balanced double-entry transaction.

### GET /api/finance/expenses

Lists expenses.

### POST /api/finance/expenses

Creates an expense record.

### GET /api/finance/donations

Lists donations.

### POST /api/finance/donations

Creates a donation receipt.

### GET /api/finance/reports/cashbook

Returns cash book data.

### GET /api/finance/reports/ledger

Returns general ledger data.

### GET /api/finance/reports/trial-balance

Returns trial balance rows.

### GET /api/finance/reports/income

Returns income accounts.

### GET /api/finance/reports/donations

Returns donation records.

## HR

### GET /api/hr/departments

Lists HR departments.

### POST /api/hr/departments

Creates an HR department.

### PATCH /api/hr/departments/:id

Updates an HR department.

### DELETE /api/hr/departments/:id

Deletes an HR department.

### GET /api/hr/designations

Lists designations.

### POST /api/hr/designations

Creates a designation.

### PATCH /api/hr/designations/:id

Updates a designation.

### DELETE /api/hr/designations/:id

Deletes a designation.

### GET /api/hr/employees

Lists employees.

### POST /api/hr/employees

Creates an employee record.

### GET /api/hr/employees/:id

Returns employee details.

### PATCH /api/hr/employees/:id

Updates an employee.

### DELETE /api/hr/employees/:id

Deletes an employee.

### GET /api/hr/attendance

Lists employee attendance.

### POST /api/hr/attendance

Creates an attendance record.

### PATCH /api/hr/attendance/:id

Updates an attendance record.

### GET /api/hr/attendance/reports

Returns attendance reporting data.

### GET /api/hr/leaves

Lists leave requests.

### POST /api/hr/leaves

Creates a leave request.

### PATCH /api/hr/leaves/:id

Updates a leave request.

### GET /api/hr/payroll

Lists payroll records.

### POST /api/hr/payroll/generate

Generates monthly payroll for an employee.

### POST /api/hr/payroll/pay

Marks payroll as paid and creates finance transactions.

### GET /api/hr/payroll/:id

Returns payroll details.

## Inventory

### GET /api/inventory/categories

Lists inventory and asset categories.

### POST /api/inventory/categories

Creates a category.

### PATCH /api/inventory/categories/:id

Updates a category.

### DELETE /api/inventory/categories/:id

Deletes a category.

### GET /api/inventory/assets

Lists fixed assets.

### POST /api/inventory/assets

Creates a fixed asset.

### GET /api/inventory/assets/:id

Returns asset details.

### PATCH /api/inventory/assets/:id

Updates an asset.

### DELETE /api/inventory/assets/:id

Deletes an asset.

### GET /api/inventory/items

Lists inventory items.

### POST /api/inventory/items

Creates an inventory item.

### POST /api/inventory/items/:id/stock

Records a stock movement.

### GET /api/inventory/suppliers

Lists suppliers.

### POST /api/inventory/suppliers

Creates a supplier.

### GET /api/inventory/purchases

Lists purchases.

### POST /api/inventory/purchases

Creates a purchase record.

### GET /api/inventory/maintenance

Lists maintenance records.

### POST /api/inventory/maintenance

Creates a maintenance record and matching expense.

### GET /api/inventory/reports/assets

Returns asset report data.

### GET /api/inventory/reports/stock

Returns stock report data.

### GET /api/inventory/reports/purchases

Returns purchase report data.

## Library

### GET /api/library/categories

Lists library book categories.

### POST /api/library/categories

Creates a book category.

### PATCH /api/library/categories/:id

Updates a book category.

### DELETE /api/library/categories/:id

Deletes a book category.

### GET /api/library/books

Lists books with copies and metadata.

### POST /api/library/books

Creates a book record.

### GET /api/library/books/:id

Returns book details.

### PATCH /api/library/books/:id

Updates a book record.

### DELETE /api/library/books/:id

Deletes a book record.

### POST /api/library/books/:id/copies

Creates a new book copy.

### GET /api/library/members

Lists library members.

### GET /api/library/issues

Lists issued books.

### POST /api/library/issues

Issues a book copy to a member.

### POST /api/library/issues/:id/return

Returns a book copy and calculates any fine.

### GET /api/library/reports/books

Returns book inventory report data.

### GET /api/library/reports/issues

Returns issued books report data.

### GET /api/library/reports/fines

Returns fine collection report data.
