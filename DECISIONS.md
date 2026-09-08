# Decisions Log

## Stack adaptation
- **Decision:** Use Laravel 13 (PHP) instead of Next.js + NestJS (Node.js) as specified in design.md
- **Reason:** The existing scaffold is Laravel 13; adapting preserves existing work and fits the user's preference
- **Impact:** Frontend uses Inertia.js + React instead of Next.js; API uses Laravel controllers instead of NestJS; DB is SQLite (dev) / MySQL (prod) instead of PostgreSQL

## Auth strategy
- **Decision:** Use session-based auth (Laravel built-in) instead of JWT tokens
- **Reason:** Inertia.js SPA works naturally with session cookies; no need for JWT complexity
- **Impact:** No Sanctum dependency; simpler implementation

## Notifications
- **Decision:** Custom `notifications` table instead of using Laravel's built-in notifications
- **Reason:** Simpler for the PWA use case; matches design intent more closely
- **Impact:** Slightly more code but more transparent

## API routes
- **Decision:** API routes use `auth` middleware (sessions) instead of `auth:sanctum`
- **Reason:** Inertia SPA handles auth via session cookies; no token-based API consumers in v1
