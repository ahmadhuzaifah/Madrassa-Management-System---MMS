# Architecture

## System architecture

This application is built as a split frontend/backend monorepo:

- `client/` — React + Vite SPA for dashboard and application UI
- `server/` — Express API with Prisma ORM and auth, billing, notification, and file services

The root package coordinates the two workspaces using npm workspaces and shared documentation.

## Frontend architecture

The client is structured around a single page application with:

- a central shell in `client/src/App.tsx`
- route-based views for dashboard, billing, users, reports, and settings
- data fetching with native `fetch` and cookie-based auth credentials
- progressive UI state that displays auth screens when the user is not signed in
- responsive layout patterns for sidebar, topbar, cards, and form panels

## Backend architecture

The server uses Express with modular route files:

- `server/src/routes/` — grouped HTTP endpoints
- `server/src/lib/` — shared helpers for Prisma, auth, email, and logging
- `server/src/middleware/` — authentication and role-based access control
- `server/src/server.ts` — app bootstrap and route registration
- `server/src/index.ts` — process entry point for local startup

## Authentication flow

1. Client sends credentials to `POST /api/auth/login`
2. Backend validates the credentials and issues a JWT cookie
3. Protected endpoints use `requireAuth` middleware to verify the token
4. Role checks are enforced with `requireRole(['ADMIN'])` where required
5. Email verification and password reset flows are handled by dedicated auth endpoints

## Database architecture

The backend uses Prisma to manage a relational data model with the following key entities:

- `User`
- `Setting`
- `Plan`
- `Subscription`
- `Invoice`
- `Notification`
- `ActivityLog`
- `FileUpload`
- `PasswordResetToken`
- `EmailVerificationToken`

These relations support user profiles, plan lifecycle, billing, notifications, and activity auditing.

## SaaS readiness

The architecture supports SaaS flows through:

- authenticated user sessions
- subscription and plan management
- admin audit reporting and logs
- file persistence and storage tracking
- notification delivery and read-state updates

Additional organization/workspace multi-tenancy can be added as a next evolution layer.
