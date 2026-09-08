# AGENTS.md — Engineering Buddy

## Project state

Current codebase is a **Laravel 13** (PHP 8.3, SQLite in dev) scaffold with a Calendar Event system added. The `.agents/` directory contains aspirational planning docs for a maintenance-management PWA — the actual implementation uses **Laravel + Inertia + React** (not Next.js/NestJS/PostgreSQL).

## Key commands

```sh
composer run setup     # full bootstrap: install, .env, key:generate, migrate, npm build
composer run dev       # starts server + queue + logs + Vite concurrently
composer run test      # runs `config:clear` then `php artisan test` (PHPUnit)
npm run dev            # Vite dev server only
npm run build          # Vite production build
```

## Framework quirks

- **Session, queue, cache all use `database` driver** — tables already created by the default migrations. Do not change without adjusting `.env`.
- **Pint** (`laravel/pint`) is the PHP linter/formatter. Run before committing: `./vendor/bin/pint`.
- **Tailwind CSS v4** configured via `@tailwindcss/vite` (no `tailwind.config.js` needed).
- **PHPUnit** uses SQLite `:memory:` in tests (`phpunit.xml`). Test suites: `tests/Unit`, `tests/Feature`.
- `.env` uses MySQL (`DB_CONNECTION=mysql`), but `phpunit.xml` overrides to SQLite in-memory for tests.
- Artisan commands use `Illuminate\Foundation\ComposerScripts` hooks — `post-autoload-dump` runs `package:discover`.
- **Laravel 13 `boolean` rule** only accepts `[true, false, 0, 1, '0', '1']` — does NOT accept strings `'true'`/`'false'`. Always send `0`/`1` for FormData.
- **`shouldRenderJsonWhen` in `bootstrap/app.php`** overrides the default `expectsJson()`. The callback must fall back to `$request->expectsJson()` for non-API routes, otherwise web routes with `Accept: application/json` get HTML redirects instead of JSON responses.

## Architecture

- `app/` — PSR-4 `App\` namespace
- `routes/web.php` — all app routes (no `routes/api.php`)
- `resources/js/pages/Calendar/Index.jsx` — calendar grid with event CRUD + MTD statistics
- `resources/js/pages/Locations/` — location tree (Building→Area→Room hierarchy)
- `resources/views/app.blade.php` — root template with CSRF meta tag

## Calendar Event System

- **File upload**: Uses FormData. When sending FormData, null/empty values are skipped to avoid Laravel `integer` validation failures. `all_day` is converted to `0`/`1` (not boolean) because FormData converts booleans to strings `"true"`/`"false"` which Laravel 13's boolean rule rejects.
- **JSON responses for web routes**: The `fetch()` call must include `Accept: application/json` header. The `bootstrap/app.php` `shouldRenderJsonWhen` callback must check `$request->expectsJson()` for non-API routes.
- **Venue dropdown**: Populated from rooms under area code `FL-005` (Meeting Room).
- **MTD auto-calculation**: Enter MTD value → fetches previous day's event → computes `daily = current_mtd - prev_mtd`.
- **Permissions**: All logged-in users can create/edit own events; `eng-admin` and `super-admin` see all events.
- **Statistic events**: Auto-title "Daily Statistics", all-day, green color default.
- **View toggle**: Calendar supports Day, Week, and Month views via button group in the header. Navigation (prev/next) adapts per view. Week view shows 7-day columns; Day view shows event list for a single day.

## Location hierarchy

Building → Area → Room (Floor level was removed). `floor_number` column on locations (required when type=room).

## `.agents/` directory

Contains product/design/execution docs for the planned Engineering Buddy system. When implementing from these docs, verify tech-stack assumptions (they describe NestJS + Next.js, not Laravel + Inertia) before coding.
