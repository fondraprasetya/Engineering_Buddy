# PRD.md — Engineering Buddy

**Document type:** Product Requirements Document
**Companion docs:** `design.md` (technical architecture), `taskinstruction.md` (build plan for AI coding agents)
**Status:** Draft v1.0

---

## 1. Product summary

Engineering Buddy is a mobile-first web application (PWA) that digitizes the maintenance, work order, and project workflows of an engineering/facilities department. It replaces paper-based work order forms, whiteboards for technician scheduling, and manual maintenance logs with a role-based system that supports multi-level approvals, scheduled reminders, custom checklists, and Telegram-based field updates.

## 2. Goals

1. Reduce work order turnaround time by removing paper-based approval hops.
2. Prevent missed preventive maintenance through automated scheduling and reminders.
3. Give technicians a fast, low-friction mobile interface to update task status and log daily work — including via Telegram when they can't open the app.
4. Give management (chief engineer, general manager) visibility into project timelines, budgets, and maintenance history without chasing spreadsheets.
5. Build a system that is easy to extend — new asset types, new checklist templates, new roles — without code changes where possible.

## 3. Non-goals (out of scope for v1)

- Native iOS/Android apps (PWA only for v1)
- Inventory / spare parts stock management
- Payroll or timesheet-to-payroll integration
- Multi-company / multi-tenant support
- Offline-first full sync (basic offline form queueing only, see design.md §7)

## 4. User roles

| Role | Summary |
|---|---|
| Employee | Any staff member who can report a problem or request work by creating a work order. |
| Dept head | Reviews and approves/rejects work orders from their department (1st approval gate). |
| Technician | Executes assigned tasks, fills checklists, submits daily logs, updates status. |
| Engineering admin | Manages assets, maintenance schedules, checklist templates, technician assignments. |
| Chief engineer | Final technical approval for work orders (2nd approval gate); owns maintenance history and asset oversight. |
| General manager | Read-mostly access to dashboards, project timelines/budgets, and org-wide reports. Can approve project-level budget items. |

A single user may hold multiple roles conceptually (e.g. someone acting as both engineering admin and technician) — the system should support assigning more than one role per user account. See design.md §3 for the permission matrix.

## 5. Functional requirements

Each feature below is numbered to match the original feature list and must have a corresponding epic in `taskinstruction.md`.

### F1. User roles & authentication
- Users log in with email/password (or SSO later — out of scope v1).
- Each user has one department and one or more roles.
- Role determines default landing dashboard and visible navigation items.
- Admin (engineering admin or a super-admin) can create/edit/deactivate users and assign roles/departments.

### F2. Work order lifecycle
- Employee creates a work order: title, description, asset (optional/searchable), priority (low/medium/high/urgent), photo attachment(s).
- On submit, status = `pending_dept_head`. Dept head of the requester's department is notified (in-app + Telegram if linked).
- Dept head approves → status = `pending_chief_engineer`, or rejects with a required comment → status = `rejected`, requester notified.
- Chief engineer approves → status = `approved`, or rejects with comment → status = `rejected`.
- Every approval/rejection is recorded with actor, timestamp, and comment (immutable audit trail — never overwritten).
- Once `approved`, engineering admin assigns a technician and schedule → status = `assigned`.
- Technician starts work → status = `in_progress`; completes checklist/log → status = `completed`.
- Engineering admin or chief engineer closes the work order → status = `closed`, and it becomes part of the asset's maintenance history.
- Requester can view real-time status and full approval history of their own work orders.

### F3. Maintenance schedules & reminders
- Engineering admin creates a maintenance schedule per asset: frequency type (fixed interval in days, calendar-based, or usage/meter-based), linked checklist template, assigned default technician (optional).
- System computes `next_due_date` and automatically generates a work order (or a reminder task) when due.
- Reminders sent in-app and via Telegram to the assigned technician and engineering admin, at configurable lead time (e.g. 3 days before due).
- Overdue schedules are visually flagged on the dashboard.

### F4. Project planning (timeline & budget)
- Engineering admin or chief engineer creates a project: name, description, start/end date, planned budget.
- Projects contain milestones (title, due date, status).
- Work orders can optionally be linked to a project.
- Actual budget is tracked as costs are logged against the project (manual entry v1; auto-rollup from linked work orders is a stretch goal).
- General manager and chief engineer can view a timeline (Gantt-style) and budget-vs-actual view per project.

### F5. Technician scheduling
- Engineering admin views a calendar/shift view per technician.
- Assigning a technician to a task checks for schedule conflicts (overlapping date/shift) and warns before confirming.
- Technicians can view their own upcoming schedule from their dashboard and via the `/myschedule` Telegram command.

### F6. Task assignment
- Any approved work order or maintenance-schedule-generated task can be assigned to one technician (v1) with a scheduled date and shift.
- Technician receives a notification (in-app + Telegram) on assignment.
- Reassignment is supported and logged.

### F7. Custom checklist templates
- Engineering admin builds checklist templates per asset category: an ordered list of fields (checkbox, short text, number, photo upload), each marked required or optional.
- Templates can be attached to a maintenance schedule or selected manually on a work order.
- Technicians fill the checklist as part of completing a task; responses are stored per work order.
- Templates are versioned or at minimum immutable once used (editing a template should not corrupt historical responses — see design.md §4).

### F8. Daily log sheet
- Technicians submit a daily log: date, activities performed, hours worked, issues found, optional linked work order.
- Optimized for fast mobile entry — minimal free text, dropdowns/toggles where possible.
- Engineering admin and chief engineer can view logs filtered by technician, date range, or asset.

### F9. Telegram bot integration
- Users link their Telegram account to their profile via a one-time code shown in the app.
- Bot commands (minimum set):
  - `/myorders` — list work orders/tasks assigned to the user
  - `/update <id>` — update status of a task, optionally attach a photo
  - `/myschedule` — upcoming assignments
  - `/report` — submit a quick daily log
- Bot pushes notifications for: new work order needing approval, approval/rejection result, new task assignment, maintenance reminder due.
- All bot-driven updates must be reflected in the web app in real time (or on next refresh) and vice versa — one source of truth.

### F10. Historical maintenance per asset
- Every asset has a detail page showing: asset info, all past work orders (with status and dates), all checklist responses, all daily logs referencing it, and its current/past maintenance schedules.
- Filterable by date range and work order type.
- Exportable to PDF or CSV (stretch goal for v1; required by v1.1).

## 6. Non-functional requirements

- **Mobile-first**: primary usage is on phones in the field; every screen must be fully usable on a ~375px-wide viewport before desktop is considered.
- **Performance**: initial load under 3s on 4G; core actions (approve, update status) should feel instant (<300ms perceived, optimistic UI where safe).
- **Availability**: reminders and Telegram bot must run reliably even if no user has the app open (background jobs, not client-triggered).
- **Security**: role-based access control enforced server-side on every endpoint, not just hidden in the UI. Passwords hashed (bcrypt/argon2). Telegram linking uses a short-lived one-time code, not a persistent shared secret.
- **Auditability**: approvals, rejections, and status changes are append-only records, never destructive updates.
- **Usability**: a technician with minimal typing skills should be able to complete a checklist and daily log in under 2 minutes.

## 7. Success metrics

- % of work orders approved within 24 hours (target: >80%)
- % of maintenance schedules completed before due date (target: >90%)
- Average time to complete a daily log (target: <2 min)
- % of technician updates submitted via Telegram vs. app (informational — validates bot investment)

## 8. Assumptions

- All users are within a single organization (single tenant).
- Technicians have smartphones with Telegram installed or are willing to install it.
- One technician per task in v1; multi-technician crews are a documented future enhancement (see design.md §3.6).
- Currency and locale are single/fixed for v1 (configurable, not multi-currency).

## 9. Open questions for stakeholder confirmation

- Should general manager be able to override/approve work orders directly, bypassing chief engineer, in exceptional cases?
- Should rejected work orders be editable and resubmitted by the employee, or must a new work order be created?
- What is the required data retention period for closed work orders and logs?

---
*This PRD is the source of truth for scope. Any AI agent implementing this system must treat `design.md` as the technical contract and `taskinstruction.md` as the execution plan — but if either conflicts with this PRD on intended behavior, this PRD wins and the conflict should be flagged, not silently resolved.*
