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
- `AttendanceRecord`
- `AttendanceSummary`
- `LeaveRequest`
- `FeeStructure`
- `StudentFeeAssignment`
- `FeePayment`
- `FeeInvoice`
- `Discount`
- `Exam`
- `ExamSubject`
- `StudentExamResult`
- `GradeScale`
- `ResultCard`
- `CertificateTemplate`
- `Certificate`
- `CertificateVerification`
- `Account`
- `Transaction`
- `TransactionLine`
- `ExpenseCategory`
- `Expense`
- `Donation`

These entities are linked to the owning organization and use soft-delete flags where appropriate to preserve historical records.

## Attendance module

Attendance data is stored per student and month to support daily marking, reporting, and summary metrics:

- `AttendanceRecord` stores the daily mark for a student.
- `AttendanceSummary` stores monthly totals and percentage values.
- `LeaveRequest` stores student leave requests and approval state.

The attendance models are constrained so a student can only have one attendance record per day and one monthly summary per month/year combination.

## Fee module

The fee module adds fee structures, student fee assignments, payments, invoices, and discounts:

- `FeeStructure` defines reusable pricing templates for classes and programs.
- `StudentFeeAssignment` applies a structure to a student with optional discounts.
- `FeePayment` stores collected payments and receipt numbers.
- `FeeInvoice` tracks dues and invoice status.
- `Discount` records approved reductions for a student.

The fee tables are workspace-scoped and are linked back to the student and madrassa records for isolation and reporting.

## Exams and results module

The exams module adds workspace-scoped exams, exam subject mappings, marks, grade scales, and result cards:

- `Exam` stores the exam schedule and status.
- `ExamSubject` stores total and passing marks per subject.
- `StudentExamResult` stores marks and grade per student/subject/exam.
- `GradeScale` stores percentage-to-grade mappings.
- `ResultCard` stores calculated totals, percentage, grade, and position.

Result cards are generated per student and exam after marks entry so they can be rendered and printed later.

## Certificates module

The certificates module stores templates, issued certificates, and public verification records:

- `CertificateTemplate` stores reusable layout text and certificate type.
- `Certificate` stores issued certificates with a sequential certificate number.
- `CertificateVerification` stores the public verification code and verification metadata.

## Finance module

The finance module adds double-entry bookkeeping and operational financial tracking:

- `Account` stores chart-of-account entries and balances.
- `Transaction` stores balanced vouchers.
- `TransactionLine` stores debit and credit lines for each transaction.
- `ExpenseCategory` stores expense classifications.
- `Expense` stores posted expenses.
- `Donation` stores donations and receipt numbers.

## HR module

The HR module stores organization-scoped employee records, attendance, leave, and payroll data:

- `HrDepartment` stores HR departments.
- `HrDesignation` stores job titles per department.
- `Employee` stores employee profiles and salary details.
- `EmployeeAttendance` stores daily attendance.
- `HrLeaveRequest` stores leave requests and approvals.
- `Payroll` stores monthly salary calculations.
- `SalarySlip` stores slip metadata for generated payroll.
- `EmployeeDocument` stores uploaded employee files.

## Inventory module

The inventory module stores organization-scoped assets, inventory, suppliers, purchases, stock, and maintenance data:

- `AssetCategory` stores asset categories.
- `Asset` stores fixed assets and asset value data.
- `InventoryCategory` stores consumable item categories.
- `InventoryItem` stores inventory stock records.
- `StockMovement` stores item movement history.
- `Supplier` stores vendor profiles.
- `Purchase` stores purchase headers.
- `PurchaseItem` stores purchase line items.
- `MaintenanceRecord` stores asset maintenance events.

## Library module

The library module stores organization-scoped book catalog data, members, circulation, and fines:

- `BookCategory` stores book subject categories.
- `Author` stores author profiles.
- `Publisher` stores publisher details.
- `Book` stores title-level catalog entries and stock counts.
- `BookCopy` stores individual physical copies with barcodes and accession numbers.
- `LibraryMember` stores student and employee member records.
- `BookIssue` stores issue and return events.
- `LibraryFine` stores fine assessments and payment state.

## Communication module

The communication module stores announcement content, reusable templates, recipient groups, provider settings, queue jobs, schedules, message logs, and in-app notifications:

- `NotificationTemplate` stores reusable SMS, email, WhatsApp, and in-app content.
- `Announcement` stores published or scheduled workspace announcements.
- `SmsProvider`, `EmailProvider`, and `WhatsappProvider` store provider configuration.
- `CommunicationGroup` stores custom recipient groups.
- `CommunicationRecipient` stores group recipients.
- `MessageQueue` stores queued outbound messages.
- `ScheduledMessage` stores delayed or recurring sends.
- `MessageLog` stores delivery history and status.

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
- `User` 1:N `ParentUser`
- `User` 1:N `StudentPortalAccount`
- `User` 1:N `TeacherPortalAccount`
- `User` 1:N `PortalSession`
- `User` 1:N `PortalPreference`
- `User` 1:N `PortalDevice`
- `ParentUser` 1:N `ParentStudent`
- `ParentStudent` N:1 `Student`
- `StudentPortalAccount` N:1 `Student`
- `TeacherPortalAccount` N:1 `Employee`
- `Organization` 1:N `Website`
- `Website` 1:1 `WebsiteSetting`
- `Website` 1:1 `WebsiteTheme`
- `Website` 1:N `WebsiteMenu`, `WebsitePage`, `WebsiteMedia`, `WebsiteSlider`, `WebsiteAnnouncement`, `WebsiteEvent`, `WebsiteGallery`, `WebsiteFaq`, `WebsiteTestimonial`, `WebsiteStaff`, `WebsiteContactMessage`, `WebsiteRedirect`, `WebsiteAnalytics`
- `WebsitePage` 1:N `WebsiteSection`
- `WebsiteSection` 1:N `WebsiteBlock`

## Indexes and performance

Important indexes in the schema:

- `@@index([email])` on `User`
- `@@index([userId])` on `Subscription`, `Notification`, `FileUpload`
- `@@index([userId, isRead])` on `Notification`
- `@@index([userId, createdAt])` on `ActivityLog`
- `@@index([organizationId, portalType, accountId])` on portal session and preference tables
- `@@index([organizationId, status])` on `ParentUser`, `StudentPortalAccount`, and `TeacherPortalAccount`
- `@@index([organizationId, status])` on `Website`
- `@@unique([websiteId, slug])` on `WebsitePage`

## Database setup

Local development uses SQLite by default. For production, the same Prisma models can be deployed to PostgreSQL by updating `server/.env`.

The current schema is contained in `server/prisma/schema.prisma` and migrations are stored under `server/prisma/migrations/20260711000000_init`.
