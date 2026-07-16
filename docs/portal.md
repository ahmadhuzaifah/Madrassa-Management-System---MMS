# Portal Module

The portal module provides role-scoped self-service access for parents, students, and teachers.

## Roles

- Parent
- Student
- Teacher

## Core Endpoints

- `POST /api/portal/login`
- `POST /api/portal/logout`
- `GET /api/portal/me`
- `GET /api/portal/parent/dashboard`
- `GET /api/portal/parent/students`
- `GET /api/portal/parent/fees`
- `GET /api/portal/parent/results`
- `GET /api/portal/parent/attendance`
- `GET /api/portal/parent/certificates`
- `GET /api/portal/student/dashboard`
- `GET /api/portal/student/profile`
- `GET /api/portal/student/results`
- `GET /api/portal/student/attendance`
- `GET /api/portal/student/fees`
- `GET /api/portal/student/library`
- `GET /api/portal/student/certificates`
- `GET /api/portal/teacher/dashboard`
- `GET /api/portal/teacher/classes`
- `GET /api/portal/teacher/students`
- `POST /api/portal/teacher/attendance`
- `POST /api/portal/teacher/results`
- `GET /api/portal/teacher/timetable`
- `GET /api/portal/teacher/payroll`

## Data Sources

The portal reads from existing student, attendance, fee, exam, certificate, HR, library, and communication records. Parent access is limited to linked children.
