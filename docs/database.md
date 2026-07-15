# Database Documentation

## Entities

### User

Fields:
- `id`
- `name`
- `email`
- `passwordHash`
- `role`
- `status`
- `emailVerified`
- `avatarUrl`
- `phone`
- `lastLoginAt`
- `createdAt`
- `updatedAt`

Relations:
- `settings`
- `subscriptions`
- `notifications`
- `activityLogs`
- `files`
- `resetTokens`
- `verificationTokens`

### Setting

Per-user preferences for theme, notifications, timezone, and language.

### Plan

Defines available billing plans and feature limits.

### Subscription

Tracks a user's plan, billing interval, trial dates, and cancellation state.

### Invoice

Represents a billing event tied to a subscription.

### Notification

In-app notifications assigned to a user.

### ActivityLog

Audit events for user actions, subscription updates, and admin operations.

## Madrassa foundation

The madrassa ERP layer adds these workspace-scoped tables:

- `Madrassa`
- `Branch`
- `AcademicYear`
- `Department`
- `Program`
- `ClassRoom`
- `Section`
- `Subject`
- `Timetable`
- `Guardian`
- `StudentSequence`
- `Student`
- `StudentDocument`
- `StudentTransfer`

These entities are linked to the owning organization and use soft-delete flags where appropriate to preserve historical records.

### FileUpload

Uploaded files metadata with server-side storage path.

### PasswordResetToken

Secure token record for password reset flows.

### EmailVerificationToken

Secure token record for email verification.

## Relationships

- `User` 1:N `Setting`
- `User` 1:N `Subscription`
- `Subscription` N:1 `Plan`
- `Subscription` 1:N `Invoice`
- `User` 1:N `Notification`
- `User` 1:N `ActivityLog`
- `User` 1:N `FileUpload`
- `User` 1:N `PasswordResetToken`
- `User` 1:N `EmailVerificationToken`

## Indexes and performance

Important indexes in the schema:

- `@@index([email])` on `User`
- `@@index([userId])` on `Subscription`, `Notification`, `FileUpload`
- `@@index([userId, isRead])` on `Notification`
- `@@index([userId, createdAt])` on `ActivityLog`

## Database setup

Local development uses SQLite by default. For production, the same Prisma models can be deployed to PostgreSQL by updating `server/.env`.

The current schema is contained in `server/prisma/schema.prisma` and migrations are stored under `server/prisma/migrations/20260711000000_init`.
