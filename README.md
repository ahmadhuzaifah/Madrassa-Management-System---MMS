# Northstar SaaS Platform

A full-stack SaaS platform with a React + Vite frontend and an Express + Prisma backend.

## Project overview

This repository contains two active workspaces:

- `client/` — the React frontend application
- `server/` — the Express API backend with Prisma ORM

The root workspace orchestrates both workspaces for local development and builds.

## Features

- JWT authentication with secure cookies
- User management and admin controls
- Billing plans, subscriptions, and invoice generation
- Notification feed and read-state tracking
- File uploads with server-side storage
- Activity logging and admin reporting
- Responsive dashboard UI and route-based pages

## Technology stack

- Frontend: React, Vite, TypeScript, React Router, Tailwind-style CSS
- Backend: Express, TypeScript, Prisma, SQLite (local dev), JWT auth
- Testing: Vitest, Supertest, React Testing Library

## Requirements

- Node.js 20+
- npm
- Optional: Docker for PostgreSQL production-style deployment

## Installation

```bash
npm install
```

## Running locally

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## Server database setup

The backend uses `server/.env.example` to define environment variables. For local development, SQLite is supported by default.

```bash
cp server/.env.example server/.env
npm run dev --workspace=@saas-platform/server
```

For database migrations and seeding:

```bash
cd server
npx prisma migrate deploy
npm run seed
```

## Frontend build

```bash
npm run build --workspace=@saas-platform/client
```

## Running tests

```bash
npm run test
```

## Production deployment

See `docs/deployment.md` for production readiness, environment variables, and Docker configuration.
