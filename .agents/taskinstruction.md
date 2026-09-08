# taskinstruction.md — Engineering Buddy build plan for AI coding agents

**Document type:** Execution instructions / agent prompt
**Companion docs:** `PRD.md` (what to build), `design.md` (how to build it)
**Audience:** An AI coding agent (e.g. Claude Code) executing this build, phase by phase.

---

## 0. Master kickoff prompt

Paste the block below as the first message to the AI coding agent in a fresh session, with `PRD.md`, `design.md`, and this file (`taskinstruction.md`) attached or present in the repo root.

```
You are building "Engineering Buddy," a mobile-first maintenance and work order
management PWA. Three documents define this project and take precedence in this order
when in conflict: PRD.md (product intent) > design.md (technical contract) >
taskinstruction.md (execution order).

Before writing any code:
1. Read PRD.md fully. Summarize back to me, in your own words, the 10 core features
   and the 6 user roles, in under 200 words. Wait for my confirmation before proceeding.
2. Read design.md fully. Confirm the tech stack, data model, and API design are
   understood. Flag anything ambiguous or missing rather than guessing.
3. Read this file (taskinstruction.md) fully and follow the phase order below exactly.
   Do not skip ahead to a later phase's features while an earlier phase is incomplete.

Rules for the entire build:
- Never invent scope beyond PRD.md. If something seems missing, ask or note it in
  DECISIONS.md — do not silently add features.
- Never change the tech stack, data model, or API shapes in design.md without
  explicit approval — propose the change and wait.
- Every phase ends with a working, runnable increment. Do not leave the app in a
  broken state between phases.
- Write tests for business logic that has branching (state transitions, RBAC checks,
  schedule due-date calculation) as you build it, not after.
- After each phase, produce a short PHASE_N_SUMMARY.md: what was built, what was
  deferred, what needs my review before continuing.
- If a requirement in PRD.md is ambiguous (see PRD §9 open questions), implement the
  simplest safe default, document the assumption in DECISIONS.md, and continue —
  do not block the whole build waiting for an answer to a non-blocking ambiguity.

Start with Phase 1 below.
```

---

## 1. Phase breakdown

Each phase is a vertical slice — it should produce something clickable/testable end to end, not just isolated backend or frontend work. This mirrors the PRD's guidance to "build vertically, not horizontally."

### Phase 1 — Foundation
**Goal:** Monorepo scaffold, database, auth, and a single working login-to-dashboard flow.

Tasks:
1. Scaffold monorepo per design.md §10 (`/apps/web`, `/apps/api`, `/packages/shared-types`, `/prisma`).
2. Implement `prisma/schema.prisma` exactly per design.md §4. Run initial migration.
3. Seed script: create departments, one user per role (6 users), 2–3 sample assets.
4. Implement auth: `POST /auth/login`, JWT issuance, refresh flow, argon2 hashing (design.md §9).
5. Implement RBAC guard middleware using the permission matrix in design.md §3.
6. Frontend: login screen + role-aware shell layout with bottom tab nav (mobile-first, design.md §7).
7. Each role, on login, lands on an empty dashboard shell showing their name/role/department.

**Definition of done:** Any of the 6 seeded users can log in on a mobile-width viewport and see a role-appropriate (even if empty) dashboard. RBAC guard rejects a request for an action outside the caller's role with a 403.

---

### Phase 2 — Work order core loop (PRD F2)
**Goal:** The full approval chain, end to end, is functional.

Tasks:
1. `WorkOrder` and `WorkOrderApproval` models already exist from Phase 1 migration — build the service layer implementing the state machine in design.md §5. Reject invalid transitions with a clear error.
2. API endpoints: create, get, list (role/department filtered), approve, reject, assign, status update (design.md §6).
3. Frontend: "create work order" form (employee), "pending approvals" list + approve/reject action with required comment on reject (dept head, chief engineer), work order detail page showing full approval timeline.
4. In-app notifications (simplest viable: a notifications table + unread badge) fire on: submitted, approved, rejected, assigned.
5. Unit tests: every valid and invalid state transition; RBAC enforcement on approve/reject endpoints (a technician must not be able to call the dept-head-approve endpoint, etc.).

**Definition of done:** An employee can create a work order; it visibly moves through dept head → chief engineer approval (or rejection) in the UI; the approval history is visible and immutable; unauthorized roles are blocked server-side (verify by direct API call, not just hidden UI).

---

### Phase 3 — Assets, technicians, assignment, checklists (PRD F5, F6, F7, F10 partial)
**Goal:** Approved work orders can be assigned and executed with a checklist.

Tasks:
1. Asset CRUD (engineering admin) + asset list/detail pages.
2. Checklist template builder: engineering admin defines templates with ordered fields (checkbox/text/number/photo) per design.md §4. Templates are archived, not deleted, once used.
3. Technician assignment: assign a technician + scheduled date/shift to an `approved` work order, with conflict warning (PRD F5).
4. Technician-facing "my tasks" view: list of assigned tasks, task detail with the linked checklist rendered as a fillable mobile form.
5. Completing the checklist transitions the work order `in_progress -> completed` (respecting required fields).
6. Asset detail page begins showing linked work orders (full history view completed in Phase 6).

**Definition of done:** Engineering admin can build a checklist template, attach it (directly or via schedule) to a work order, assign a technician, and the technician can complete it on a mobile viewport in a few taps, moving the work order to `completed`.

---

### Phase 4 — Maintenance schedules & reminders (PRD F3)
**Goal:** Preventive maintenance runs on autopilot.

Tasks:
1. `MaintenanceSchedule` CRUD (engineering admin): asset, checklist template, frequency type/value.
2. Cron worker (node-cron) that runs daily: computes `next_due_date`, and for schedules due within the configured lead time, either auto-generates a `WorkOrder` (status `approved`, skipping the approval gates since it's system-generated preventive maintenance — confirm this shortcut against PRD before building; document in DECISIONS.md) or creates a reminder notification if no auto-generation is desired.
3. Overdue schedule flag surfaced on engineering admin's dashboard.
4. Tests: due-date computation for each frequency type; no duplicate work orders generated for the same due cycle.

**Definition of done:** A schedule due today produces a visible reminder/task without any manual trigger, verified by advancing the system clock in a test rather than waiting a real day.

---

### Phase 5 — Daily logs & project planning (PRD F8, F4)
**Goal:** Technicians can log daily work; management can plan and track projects.

Tasks:
1. Daily log form (technician) — fast mobile entry per design.md §7. List/filter view for engineering admin and chief engineer.
2. Project CRUD + milestones (engineering admin, chief engineer). Simple timeline view (a lightweight Gantt component is acceptable).
3. Budget planned vs. actual fields on project; manual actual-cost entry v1 (auto-rollup from work orders is a stretch goal, not required for phase completion).
4. General manager read-only project/budget view.

**Definition of done:** A project with milestones and a budget can be created and viewed on a timeline; a technician's daily log is saved and visible to admin/chief engineer filtered by date or technician.

---

### Phase 6 — Telegram bot & asset history (PRD F9, F10)
**Goal:** Field updates work outside the app; historical reporting is complete.

Tasks:
1. Telegram bot module in the API, webhook-based (design.md §8). Implement account linking flow (`/telegram/link` one-time code + `/start <code>` in bot).
2. Bot commands: `/myorders`, `/update <id>`, `/myschedule`, `/report`, each calling the same service layer used by the REST API — no duplicated business logic.
3. Push notifications via bot for: approval needed, approval result, new assignment, maintenance reminder due — sharing the same notification-trigger points built in Phase 2/4.
4. Asset history page (PRD F10): aggregate view of all work orders, checklist responses, and daily logs for an asset, filterable by date range.
5. End-to-end test: a status update sent via `/update <id>` in Telegram is immediately reflected in the web app, and vice versa.

**Definition of done:** A technician can complete an entire task lifecycle (view assignment, update status, see it reflected in-app) without opening the web app, purely through Telegram commands.

---

### Phase 7 — Polish, transitions, and hardening
**Goal:** Production-readiness pass.

Tasks:
1. Add Framer Motion transitions per design.md §7 (page transitions, list entry animations, respecting `prefers-reduced-motion`).
2. Full mobile QA pass on real device widths (375px, 390px, 414px) for every screen built in Phases 1–6.
3. Error states and empty states for every list/dashboard view.
4. Rate limiting on auth and Telegram webhook endpoints (design.md §9).
5. Basic e2e test suite covering the critical path: login → create work order → approve x2 → assign → complete checklist → close → appears in asset history.
6. Write a top-level `README.md` covering setup, environment variables, and how to run migrations/seed data.

**Definition of done:** A fresh clone of the repo, with documented setup steps, runs the full app locally and passes the e2e critical-path test.

---

## 2. Cross-cutting rules for every phase

- **RBAC is server-side, always.** Every new endpoint must be checked against design.md §3 before merging. A missing check is a blocking bug, not a nice-to-have fix later.
- **State transitions are never bypassed from the frontend.** The frontend calls the same state-machine-guarded endpoints; it never sets `status` directly.
- **No destructive edits to audit data.** `WorkOrderApproval` rows and closed `WorkOrder` records are never updated or deleted by application code.
- **Every list/dashboard is built mobile-first** — design at 375px width first, then verify it doesn't look broken at desktop widths, not the other way around.
- **Do not add new tables, endpoints, or dependencies not implied by PRD.md/design.md** without noting the addition and reason in `DECISIONS.md`.

## 3. What "done" means for the whole project

The project is complete when every Definition of Done above is met, the Phase 7 e2e critical path test passes, and a person in each of the 6 roles can complete their PRD-defined core action (create work order / approve / execute a checklist / manage schedules / approve a budget item / view reports) on a phone-width screen without confusion.
