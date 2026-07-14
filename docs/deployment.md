# Deployment

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the backend environment example:
   ```bash
   cp server/.env.example server/.env
   ```
3. Generate Prisma client:
   ```bash
   cd server
   npx prisma generate
   ```
4. Run the app:
   ```bash
   npm run dev
   ```

Frontend is available at `http://localhost:5173`; backend is available at `http://localhost:4000`.

## Database migrations

Run migrations from the `server` workspace:

```bash
cd server
npx prisma migrate deploy
```

For local dev SQLite you can also use:

```bash
cd server
npx prisma db push
```

## Seed data

Seed the development database:

```bash
cd server
npm run seed
```

## Docker deployment

Start PostgreSQL locally using Docker Compose:

```bash
docker compose up -d postgres
```

Then point `server/.env` at the PostgreSQL host:

```text
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/northstar"
```

## Production checklist

- Ensure `JWT_SECRET` is a strong random secret
- Set `DATABASE_URL`, `JWT_SECRET`, and `CLIENT_URL`; the server refuses to start when any are missing.
- Set `UPLOAD_MAX_BYTES` to an appropriate upload limit (10 MiB by default).
- Use a secure SMTP provider for transactional email
- Use PostgreSQL or another managed relational DB in production
- Configure `CLIENT_URL` for the frontend domain
- Enable `secure` cookies behind HTTPS
- Use proper build and deploy pipelines for both workspaces
