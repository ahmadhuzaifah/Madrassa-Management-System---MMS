# HR Module Guide

## Overview

The HR module manages employees, departments, designations, attendance, leave, payroll, and salary slips for each workspace.

## Screens

- `/hr`
- `/hr/employees`
- `/hr/employees/new`
- `/hr/employees/:id`
- `/hr/departments`
- `/hr/designations`
- `/hr/attendance`
- `/hr/leaves`
- `/hr/payroll`
- `/hr/payroll/:id`
- `/hr/reports`

## API endpoints

- `GET /api/hr/departments`
- `POST /api/hr/departments`
- `PATCH /api/hr/departments/:id`
- `DELETE /api/hr/departments/:id`
- `GET /api/hr/designations`
- `POST /api/hr/designations`
- `PATCH /api/hr/designations/:id`
- `DELETE /api/hr/designations/:id`
- `GET /api/hr/employees`
- `POST /api/hr/employees`
- `GET /api/hr/employees/:id`
- `PATCH /api/hr/employees/:id`
- `DELETE /api/hr/employees/:id`
- `GET /api/hr/attendance`
- `POST /api/hr/attendance`
- `PATCH /api/hr/attendance/:id`
- `GET /api/hr/attendance/reports`
- `GET /api/hr/leaves`
- `POST /api/hr/leaves`
- `PATCH /api/hr/leaves/:id`
- `GET /api/hr/payroll`
- `POST /api/hr/payroll/generate`
- `POST /api/hr/payroll/pay`
- `GET /api/hr/payroll/:id`
