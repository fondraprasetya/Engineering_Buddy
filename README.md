# Engineering Buddy

Mobile-first maintenance and work order management system built on Laravel 13 + Inertia React + Spatie Laravel Permission.

## Requirements

- PHP 8.3+
- Node.js 20+
- Composer 2+
- SQLite (dev) or MySQL (production)

## Setup

```bash
# Install PHP dependencies
composer install

# Install JS dependencies
npm install

# Create environment file
cp .env.example .env

# Generate app key
php artisan key:generate

# Run database migrations and seed
php artisan migrate --seed

# Build frontend
npm run build

# Start dev server (runs Vite + Laravel concurrently)
composer run dev
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `APP_NAME` | `Engineering Buddy` | Application name |
| `APP_ENV` | `local` | Environment (`local`, `production`) |
| `APP_DEBUG` | `true` | Debug mode |
| `APP_URL` | `http://localhost` | Application URL |
| `DB_CONNECTION` | `sqlite` | Database driver (`sqlite` or `mysql`) |
| `SESSION_DRIVER` | `database` | Session driver |
| `QUEUE_CONNECTION` | `database` | Queue driver |
| `CACHE_STORE` | `database` | Cache driver |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token (see Telegram setup) |

## Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram.
2. Copy the token and add it to your `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```
3. Set the webhook URL:
   ```
   https://your-app.com/api/v1/telegram/webhook
   ```
4. Users link their Telegram account from the Profile page in the app.

## Seed Data

The seeder creates 3 departments and 6 users (one per role):

| Role | Email | Password |
|---|---|---|
| Employee | `employee@example.com` | `password` |
| Dept Head | `depthead@example.com` | `password` |
| Technician | `technician@example.com` | `password` |
| Engineering Admin | `engadmin@example.com` | `password` |
| Chief Engineer | `chief@example.com` | `password` |
| General Manager | `gm@example.com` | `password` |

Re-seed at any time:

```bash
php artisan migrate:fresh --seed
```

## Testing

```bash
composer run test
```

Runs 50 feature/unit tests (104 assertions) covering the state machine, RBAC, critical path, maintenance schedule generation, Telegram commands, and asset history.

## Commands

| Command | Description |
|---|---|
| `composer run dev` | Start all dev servers (Vite + Laravel + queue + logs) |
| `composer run setup` | Full bootstrap: install, migrate, seed, build |
| `composer run test` | Run PHPUnit test suite |
| `php artisan maintenance:process` | Generate PM work orders for due schedules (runs daily via cron) |
| `npm run build` | Production frontend build |

## Project Structure

```
app/
  Http/Controllers/      # Web + API controllers
  Models/                # Eloquent models
  Services/              # WorkOrderService, NotificationService, TelegramService
  Http/Middleware/        # CheckPermission middleware
database/
  migrations/            # 18 migration files
  seeders/               # RolePermissionSeeder, DatabaseSeeder
resources/
  js/
    pages/               # Inertia React pages (Login, Dashboard, WorkOrders, Assets, etc.)
    layouts/             # AuthenticatedLayout
routes/
  web.php                # Inertia page routes
  api.php                # REST API routes
tests/
  Feature/               # Feature tests (10 test files)
```

## Roles & Permissions

Six roles with server-side RBAC:

- **Employee** — Create work orders
- **Dept Head** — First approval gate (own department)
- **Technician** — Execute assigned tasks, fill checklists, daily logs
- **Engineering Admin** — Manage assets, schedules, templates, assignments
- **Chief Engineer** — Second approval gate, project management
- **General Manager** — Read-only org-wide dashboards and reports

## License

MIT
