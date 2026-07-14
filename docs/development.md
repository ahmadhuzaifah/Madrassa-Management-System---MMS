# Developer Guide

## Coding standards

- Use TypeScript consistently across frontend and backend.
- Keep API routes thin; move business logic to shared modules.
- Validate input with Zod on the backend.
- Use `async/await` and handle errors with proper HTTP status codes.
- Use the shared `asyncHandler` and `AppError` helpers for Express routes; errors are returned as `{ error: { code, message } }`.
- Keep UI state in React component state unless it belongs in a shared store.

## Branch strategy

- `main` contains production-ready code.
- `feature/*` branches are used for new functionality.
- `fix/*` branches are used for bug fixes.
- Use pull requests with code review and tests before merging.

## File naming conventions

- React components use `PascalCase`.
- Route and utility files use `kebab-case`.
- Test files use `*.test.ts`.
- Docs use Markdown under `docs/`.

## Adding new modules

1. Add a new route file under `server/src/routes`.
2. Add any shared helpers to `server/src/lib`.
3. Add middleware for auth or role checks if needed.
4. Register the route in `server/src/server.ts`.
5. Add frontend views under `client/src/` and wire the route in `App.tsx`.
6. Add documentation to `docs/api.md` and `docs/architecture.md`.

## Debugging guide

- Use `console.error` for unexpected backend errors.
- Verify Prisma queries with `npx prisma studio` if the DB is available.
- Use browser dev tools and network logs for frontend API issues.
- Run `npm run build --workspace=@saas-platform/client` and `npm run build --workspace=@saas-platform/server` to catch compile-time errors.
- Run `npm run test` to verify automated coverage.
- Browser mutations require the CSRF token returned by `GET /api/auth/csrf-token`; Bearer-token API clients are exempt.
