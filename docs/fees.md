# Fee Module Guide

## Overview

The fee module manages fee structures, student assignments, payment collection, invoices, and outstanding balances for a madrassa workspace.

## Screens

- `/fees`
- `/fees/structures`
- `/fees/assignments`
- `/fees/payments`
- `/fees/reports`

## Flow

1. Create a fee structure for a class or program.
2. Assign the structure to a student.
3. Record payments against the student.
4. Review invoices and outstanding dues.
5. Print the receipt after payment collection.

## API endpoints

- `GET /api/fees/structures`
- `POST /api/fees/structures`
- `PATCH /api/fees/structures/:id`
- `DELETE /api/fees/structures/:id`
- `GET /api/fees/student/:id`
- `POST /api/fees/student/:id/assign`
- `POST /api/fees/payments`
- `GET /api/fees/payments`
- `GET /api/fees/invoices`
- `GET /api/fees/invoices/:id`
- `GET /api/fees/reports/collection`
- `GET /api/fees/reports/outstanding`

## Notes

- Payments generate receipt numbers and invoices automatically.
- All fee data is isolated to the current madrassa workspace.
- Receipt printing uses the browser print dialog in the current UI.
