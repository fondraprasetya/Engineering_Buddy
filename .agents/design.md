# design.md — Engineering Buddy

**Document type:** Technical design document
**Companion docs:** `PRD.md` (product requirements), `taskinstruction.md` (build plan for AI coding agents)
**Status:** Draft v1.0

This document defines *how* the system in PRD.md is built. It is the binding technical contract — an AI coding agent should not deviate from the stack, schema, or API shapes defined here without flagging the deviation explicitly.

---

## 1. Tech stack (pinned)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (React, App Router) + TypeScript | PWA-enabled, SSR for fast first load |
| Styling | Tailwind CSS + shadcn/ui | Mobile-first utility classes |
| Backend | Node.js + NestJS (or Fastify if agent prefers lighter framework — confirm before switching) | REST API |
| Database | PostgreSQL 15+ | Relational fit for approval workflows |
| ORM | Prisma | Type-safe schema, migrations |
| Auth | JWT (access + refresh token), argon2 password hashing | RBAC middleware on every route |
| Background jobs | node-cron (or BullMQ + Redis if job volume grows) | Reminders, schedule generation |
| Telegram bot | node-telegram-bot-api, webhook mode | Shares the same backend service |
| File storage | S3-compatible bucket (or local disk in dev) | Photos for work orders/checklists |
| Hosting (suggested) | Railway/Render for app + managed Postgres | Swap freely; not load-bearing for design |

**Do not introduce a different database engine, a different auth strategy (e.g. sessions-only, no RBAC), or a native mobile framework without explicit approval — these are fixed decisions.**

## 2. System architecture

```
[Next.js PWA] ──HTTPS──> [NestJS API] ──> [PostgreSQL]
      │                        │
      │                        ├──> [Cron worker] (reminders, schedule generation)
      │                        └──> [Telegram Bot webhook handler]
      │
[Telegram App] <──webhook/push── [Telegram Bot API] <── [NestJS API]
```

- The Telegram bot is **not a separate app** — it is a module inside the same backend that calls the same service layer (work order service, checklist service, etc.) as the REST API. This guarantees Telegram-driven updates and app-driven updates stay consistent (PRD §F9 requirement).
- The cron worker can run in-process (node-cron) for v1; extract to a separate worker process only if load requires it.

## 3. Role & permission matrix

Enforce this server-side via a guard/middleware that checks `role` + resource ownership. Never rely on frontend hiding alone.

| Action | Employee | Dept head | Technician | Eng. admin | Chief engineer | GM |
|---|---|---|---|---|---|---|
| Create work order | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve/reject (1st gate) | ❌ | ✅ (own dept) | ❌ | ❌ | ❌ | ❌ |
| Approve/reject (2nd gate) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Assign technician | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Update task status / checklist | ❌ | ❌ | ✅ (own tasks) | ✅ | ✅ | ❌ |
| Manage assets | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Manage checklist templates | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Manage maintenance schedules | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Create/manage projects | ❌ | ❌ | ❌ | ✅ | ✅ | View + budget approve |
| View asset history | ❌ | Own dept assets | Own tasks | ✅ | ✅ | ✅ |
| Manage users/roles | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| View org-wide dashboards | ❌ | Dept-scoped | ❌ | ✅ | ✅ | ✅ |

### 3.6 Future: multi-technician crews
v1 models `technician_assignments` as one technician per work order. If crew-based jobs become common, extend to a join table `work_order_crew(work_order_id, technician_id, role_on_task)` without breaking the existing single-assignee flow — do not build this in v1 unless PRD is updated.

## 4. Data model

Implement as a Prisma schema. Field types below are canonical; adjust only for framework-specific syntax, not semantics.

```
Department        { id, name }

User              { id, name, email, password_hash, role[], department_id -> Department, phone, is_active }

Asset             { id, name, code, category, location, department_id -> Department, status }

WorkOrder         { id, requester_id -> User, asset_id -> Asset?, project_id -> Project?,
                     title, description, priority[low|medium|high|urgent],
                     status[draft|pending_dept_head|pending_chief_engineer|rejected|
                            approved|assigned|in_progress|completed|closed],
                     created_at, updated_at }

WorkOrderApproval { id, work_order_id -> WorkOrder, approver_id -> User,
                     level[1=dept_head|2=chief_engineer], action[approved|rejected],
                     comment, created_at }
                     -- append-only, never updated or deleted

MaintenanceSchedule { id, asset_id -> Asset, checklist_template_id -> ChecklistTemplate?,
                       frequency_type[fixed_days|calendar|usage], frequency_value,
                       next_due_date, default_technician_id -> User? }

ChecklistTemplate { id, name, asset_category, created_by -> User, is_archived }
                    -- archived (not deleted) once used, to protect historical responses

ChecklistField    { id, template_id -> ChecklistTemplate, label,
                     field_type[checkbox|text|number|photo], required, sort_order }

ChecklistResponse { id, work_order_id -> WorkOrder, field_id -> ChecklistField, value }

Project           { id, name, description, start_date, end_date,
                     budget_planned, budget_actual, status, created_by -> User }

ProjectMilestone  { id, project_id -> Project, title, due_date, status }

TechnicianAssignment { id, technician_id -> User, work_order_id -> WorkOrder,
                        scheduled_date, shift, status }

DailyLog          { id, technician_id -> User, work_order_id -> WorkOrder?,
                     log_date, activities, hours_worked, issues_found }

TelegramLink      { id, user_id -> User (unique), chat_id, linked_at }
```

Full ERD with cardinalities was reviewed and approved in the design conversation preceding this doc — implement exactly as specified above; do not add speculative tables (e.g. inventory, notifications-as-a-table) unless a feature in PRD.md requires it.

## 5. Work order state machine

Valid transitions only — reject any API call that attempts an invalid transition:

```
draft -> pending_dept_head
pending_dept_head -> pending_chief_engineer   (dept head approves)
pending_dept_head -> rejected                 (dept head rejects)
pending_chief_engineer -> approved            (chief engineer approves)
pending_chief_engineer -> rejected            (chief engineer rejects)
approved -> assigned                          (eng admin assigns technician)
assigned -> in_progress                       (technician starts)
in_progress -> completed                      (technician finishes checklist/log)
completed -> closed                           (eng admin or chief engineer closes)
```

`rejected` is terminal in v1 (see PRD §9 open question on resubmission — do not build resubmission until that's resolved; if built prematurely, gate it behind a feature flag).

## 6. API design (REST, versioned under `/api/v1`)

Represent each PRD feature as a resource. Example shape (agent should generate full OpenAPI/Swagger spec from this during implementation):

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh

GET    /api/v1/work-orders              (filtered by role/department automatically)
POST   /api/v1/work-orders
GET    /api/v1/work-orders/:id
POST   /api/v1/work-orders/:id/approve  (level inferred from current status + caller role)
POST   /api/v1/work-orders/:id/reject
POST   /api/v1/work-orders/:id/assign
POST   /api/v1/work-orders/:id/status   (technician-driven transitions)

GET    /api/v1/assets
GET    /api/v1/assets/:id
GET    /api/v1/assets/:id/history       (F10 — aggregated work orders + logs + checklist responses)

GET    /api/v1/maintenance-schedules
POST   /api/v1/maintenance-schedules

GET    /api/v1/checklist-templates
POST   /api/v1/checklist-templates
POST   /api/v1/work-orders/:id/checklist-responses

GET    /api/v1/projects
POST   /api/v1/projects
POST   /api/v1/projects/:id/milestones

GET    /api/v1/technicians/:id/schedule
POST   /api/v1/technician-assignments

POST   /api/v1/daily-logs
GET    /api/v1/daily-logs

POST   /api/v1/telegram/link            (generates one-time code)
POST   /api/v1/telegram/webhook         (bot updates land here)
```

Every mutating endpoint must: (1) authenticate via JWT, (2) authorize via the permission matrix in §3, (3) validate input with a schema (zod/class-validator), (4) return a consistent error shape.

## 7. Mobile-first UI structure

- **Navigation**: bottom tab bar with role-dependent tabs (max 5). Example for technician: Home, My tasks, Schedule, Logs, Profile. Example for dept head: Home, Approvals, Reports, Profile.
- **Home dashboard per role**: surfaces the single most relevant queue first (e.g. dept head sees pending approvals above the fold, technician sees today's assigned tasks).
- **Forms**: single-column, large touch targets (min 44px), native input types (`tel`, `date`, `number`) to trigger correct mobile keyboards.
- **Offline tolerance (v1 minimal)**: daily log and checklist forms queue submissions in local state/IndexedDB if network fails, and retry on reconnect. Full offline-first sync is out of scope (PRD §3).
- **Transitions/animation**: use Framer Motion for page transitions and list item entry; keep durations under 200ms; respect `prefers-reduced-motion`.
- **Icons**: use a consistent icon set (e.g. Tabler or Lucide) — do not mix icon libraries.

## 8. Telegram bot design

- Runs in webhook mode against the same backend (see §2).
- Account linking: user requests a one-time code in-app (`POST /api/v1/telegram/link` returns a 6-digit code, expires in 10 minutes) → user sends `/start <code>` to the bot → backend verifies and stores `chat_id` in `TelegramLink`.
- Commands map directly to existing service-layer calls — do not duplicate business logic in the bot handler.
- Notifications are pushed via the bot using the same service events that would trigger in-app notifications (use a shared event emitter or notification service so both channels stay in sync).

## 9. Security notes

- Passwords: argon2id hashing, never store plaintext or reversible-encrypted passwords.
- JWT: short-lived access token (~15 min), longer-lived refresh token (httpOnly cookie), rotate on refresh.
- All file uploads (checklist photos, work order attachments) validated for type/size server-side before storage; never trust client-provided MIME type alone.
- Telegram linking codes are single-use and time-limited (see §8) — never a static shared token.
- Rate-limit auth endpoints and the Telegram webhook endpoint.

## 10. Repository structure (monorepo)

```
/apps
  /web        -> Next.js frontend
  /api        -> NestJS backend (includes cron worker + telegram module)
/packages
  /shared-types -> TypeScript types/interfaces shared between web and api
  /ui           -> shared React component library (shadcn-based)
/prisma
  schema.prisma
  migrations/
```

A monorepo (pnpm workspaces or Turborepo) is preferred so an AI coding agent has full context of frontend, backend, and shared types in one place, per PRD's development-approach guidance.

---
*Any implementation decision not covered here should default to the simplest option that satisfies PRD.md, and should be noted in a `DECISIONS.md` changelog rather than silently assumed.*
