# Finance & Accounting Guide

## Overview

The finance module manages the chart of accounts, double-entry transactions, expenses, donations, and accounting reports.

## Screens

- `/finance`
- `/finance/accounts`
- `/finance/transactions`
- `/finance/expenses`
- `/finance/donations`
- `/finance/reports`

## Flow

1. Create accounts for cash, income, and expenses.
2. Post balanced journal entries.
3. Record donations and expenses.
4. Review cash book, ledger, and trial balance reports.

## API endpoints

- `GET /api/finance/accounts`
- `POST /api/finance/accounts`
- `GET /api/finance/transactions`
- `POST /api/finance/transactions`
- `GET /api/finance/expenses`
- `POST /api/finance/expenses`
- `GET /api/finance/donations`
- `POST /api/finance/donations`
- `GET /api/finance/reports/cashbook`
- `GET /api/finance/reports/ledger`
- `GET /api/finance/reports/trial-balance`
- `GET /api/finance/reports/income`
- `GET /api/finance/reports/donations`
