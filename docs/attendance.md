# Attendance Module Guide

## Overview

The attendance module records daily presence, absence, late arrivals, and leave status for madrassa students. It also exposes summary data for student profiles and reports.

## Core flows

1. Open the daily attendance page.
2. Choose the branch, class, section, and date.
3. Load the student list.
4. Mark each student as present, absent, late, or leave.
5. Save attendance.

## Screens

- `/attendance`
- `/attendance/daily`
- `/attendance/reports`
- `/attendance/leaves`

## API endpoints

- `GET /api/attendance`
- `POST /api/attendance`
- `PATCH /api/attendance/:id`
- `GET /api/attendance/reports/daily`
- `GET /api/attendance/reports/monthly`
- `GET /api/attendance/student/:id`
- `POST /api/attendance/leaves`
- `GET /api/attendance/leaves`

## Notes

- Attendance records are unique per student and day.
- Monthly summaries are stored so student profiles can display aggregate totals quickly.
- Leave requests are workspace-scoped and tied to the madrassa owning organization.
