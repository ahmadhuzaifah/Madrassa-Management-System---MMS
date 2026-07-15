# Admin guide

## Access

- Admin routes require `role = ADMIN`
- Non-admin users are redirected to `/unauthorized`

## Main areas

- Dashboard: platform metrics and recent activity
- Users: search, filter, edit, reset passwords, delete
- Organizations: list, inspect, update, delete
- Roles and permissions: manage RBAC definitions
- Settings: system-wide controls for app, email, and storage
- Logs: audit and security event review
- Reports: reporting exports and summary metrics

## Operational notes

- Admin actions are logged to the audit trail
- Session invalidation is enforced after critical account changes
- New roles and permissions are persisted in the database
