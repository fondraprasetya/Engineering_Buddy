# Phase 2 Summary — Work Order Core Loop

## What was built
- **WorkOrderService** — full state machine (design.md §5) with valid transition enforcement
- **CheckPermission middleware** — reusable RBAC guard for routes
- **API routes** (`/api/v1/work-orders/*`) — create, list, show, approve, reject, assign, status update
- **In-app notifications** — NotificationService fires on every state transition; notifications sent to requester + relevant approvers
- **Frontend pages**:
  - Work Orders list (role-filtered: employee sees own, dept head sees department, etc.)
  - Create Work Order form (title, description, asset, priority)
  - Work Order detail page with approval timeline + action buttons (approve/reject/start/complete)
- **Tests**: 20 passing tests covering state transitions, invalid transitions, RBAC enforcement, department-scoped approvals

## State machine implemented
```
draft → pending_dept_head → pending_chief_engineer → approved → assigned → in_progress → completed → closed
                                              ↘ rejected ↙
```

## RBAC enforcement
Server-side permission checks on every endpoint. Verified by tests:
- Technician cannot approve (403)
- GM cannot create work orders (403)  
- Employee cannot assign technician (403)
- Dept head can only approve own department's requests

## Files created
- `app/Services/WorkOrderService.php`
- `app/Services/NotificationService.php`
- `app/Http/Middleware/CheckPermission.php`
- `app/Http/Controllers/Api/WorkOrderController.php`
- `app/Http/Controllers/WorkOrderController.php` (Inertia pages)
- `app/Http/Controllers/Api/NotificationController.php`
- `app/Models/Notification.php`
- `database/migrations/*_create_notifications_table.php`
- `routes/api.php`
- `resources/js/pages/WorkOrders/Index.jsx`, `Create.jsx`, `Show.jsx`
- `tests/Feature/WorkOrderStateMachineTest.php`
- `tests/Feature/WorkOrderApiTest.php`

## What's next
- Phase 3: Assets, Technicians, Checklists
