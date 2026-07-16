# Parent Portal

The parent portal provides secure self-service access for guardians linked to students in the same organization.

## Routes

- `/parent`
- `/parent/dashboard`
- `/parent/student`
- `/parent/attendance`
- `/parent/fees`
- `/parent/results`
- `/parent/certificates`
- `/parent/announcements`

## Data Access

- Parents can only see students linked through the parent account relation.
- Attendance, fee, exam, certificate, and announcement data are scoped to the current workspace.
- Parent preferences control which alerts are enabled.

## Security

- Uses the existing authentication/session system.
- Preserves organization isolation.
- Audit logging is retained for account creation and preference changes.
