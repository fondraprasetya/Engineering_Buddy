<?php

namespace App\Services;

use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderApproval;
use Illuminate\Validation\ValidationException;

class WorkOrderService
{
    private const array TRANSITIONS = [
        'draft' => ['pending_dept_head'],
        'pending_dept_head' => ['pending_chief_engineer', 'rejected'],
        'pending_chief_engineer' => ['approved', 'rejected'],
        'approved' => ['assigned'],
        'assigned' => ['in_progress'],
        'in_progress' => ['pending_check'],
        'pending_check' => ['completed', 'in_progress'],
        'completed' => ['pending_close'],
        'pending_close' => ['closed', 'completed'],
    ];

    public function allowedTransitions(?string $status): array
    {
        return self::TRANSITIONS[$status ?? 'draft'] ?? [];
    }

    /**
     * Determine the role responsible for reviewing a work order at its current status.
     * For work orders requested by a technician, the dept-head gates are handled
     * by the chief engineer instead.
     */
    public function reviewerRole(WorkOrder $workOrder, ?string $status = null): string
    {
        $status = $status ?? $workOrder->status;

        $base = match ($status) {
            'pending_dept_head', 'pending_check', 'pending_close' => 'dept-head',
            'pending_chief_engineer' => 'chief-engineer',
            default => 'dept-head',
        };

        if ($base === 'dept-head' && $workOrder->requester?->hasRole('technician')) {
            return 'chief-engineer';
        }

        return $base;
    }

    public function transition(WorkOrder $workOrder, string $newStatus): WorkOrder
    {
        $allowed = $this->allowedTransitions($workOrder->status);

        if (! in_array($newStatus, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => "Transition from '{$workOrder->status}' to '{$newStatus}' is not allowed.",
            ]);
        }

        $update = ['status' => $newStatus];
        if ($newStatus === 'completed') {
            $update['completed_at'] = now();
        }
        $workOrder->update($update);
        $fresh = $workOrder->fresh();

        if ($newStatus === 'completed' && $fresh->project_id) {
            $fresh->syncProjectBudget();
        }

        $this->sendStatusNotification($fresh);

        return $fresh;
    }

    private function sendStatusNotification(WorkOrder $workOrder): void
    {
        $notifications = app(NotificationService::class);

        $workOrder->loadMissing('requester.department', 'asset', 'location');

        $photoPath = $workOrder->completion_photo
            ?? $workOrder->photo
            ?? $workOrder->photos()->latest()->value('photo_path');

        $baseData = [
            'work_order_id' => $workOrder->id,
            'title' => $workOrder->title,
            'requester' => $workOrder->requester?->name ?? 'N/A',
            'department' => $workOrder->requester?->department?->name ?? 'N/A',
            'priority' => ucfirst($workOrder->priority),
            'asset' => $workOrder->asset
                ? ($workOrder->asset->name.($workOrder->asset->code ? " ({$workOrder->asset->code})" : ''))
                : 'N/A',
            'location' => $workOrder->location?->name ?? 'N/A',
            'created' => $workOrder->created_at?->format('d M Y, H:i') ?? 'N/A',
        ];

        if ($photoPath) {
            $baseData['photo_path'] = $photoPath;
        }

        $messages = [
            'pending_dept_head' => ['type' => 'work_order_submitted'],
            'pending_chief_engineer' => ['type' => 'work_order_approved_dept'],
            'approved' => ['type' => 'work_order_approved_chief'],
            'rejected' => ['type' => 'work_order_rejected'],
            'assigned' => ['type' => 'work_order_assigned'],
            'pending_check' => ['type' => 'work_order_pending_check'],
            'completed' => ['type' => 'work_order_completed'],
            'pending_close' => ['type' => 'work_order_pending_close'],
            'in_progress' => ['type' => 'work_order_sent_back'],
            'closed' => ['type' => 'work_order_closed'],
        ];

        $msg = $messages[$workOrder->status] ?? null;
        if (! $msg) {
            return;
        }

        $this->sendWithKeyboard($notifications, $workOrder->requester, $msg['type'], $baseData, $workOrder);

        $technicianAssignment = $workOrder->technicianAssignments()->latest()->first();
        if ($technicianAssignment?->technician) {
            $this->sendWithKeyboard($notifications, $technicianAssignment->technician, $msg['type'], $baseData, $workOrder);
        }

        if (in_array($workOrder->status, ['pending_dept_head', 'pending_chief_engineer', 'pending_check', 'pending_close'], true)) {
            $role = $this->reviewerRole($workOrder, $workOrder->status);
            $approvers = User::role($role)
                ->where('department_id', $workOrder->requester->department_id)
                ->get();
            foreach ($approvers as $approver) {
                $this->sendWithKeyboard($notifications, $approver, $msg['type'], $baseData, $workOrder);
            }
        }
    }

    private function sendWithKeyboard(NotificationService $notifications, User $user, string $type, array $baseData, WorkOrder $workOrder): void
    {
        $data = $baseData;

        $keyboard = $this->buildActionKeyboard($user, $workOrder);
        if ($keyboard) {
            $data['keyboard'] = $keyboard;
        }

        $notifications->send($user, $type, $data);
    }

    private function buildActionKeyboard(User $user, WorkOrder $workOrder): ?array
    {
        $role = $user->getRoleNames()->first();
        $woId = $workOrder->id;

        if ($workOrder->status === 'assigned') {
            $latestAssignment = $workOrder->technicianAssignments()->latest()->first();
            if ($latestAssignment && $latestAssignment->technician_id === $user->id) {
                return [
                    'inline_keyboard' => [
                        [
                            ['text' => '▶️ Start Work', 'callback_data' => "start_work:{$woId}"],
                        ],
                    ],
                ];
            }
        }

        $reviewerRole = $this->reviewerRole($workOrder, $workOrder->status);

        $canApprove = match ($workOrder->status) {
            'pending_dept_head', 'pending_check', 'pending_close' => $role === $reviewerRole && $user->department_id === $workOrder->requester->department_id,
            'pending_chief_engineer' => $role === 'chief-engineer',
            default => false,
        };

        if (! $canApprove) {
            return null;
        }

        return [
            'inline_keyboard' => [
                [
                    ['text' => '✅ Approve', 'callback_data' => "approve:{$woId}"],
                    ['text' => '❌ Reject', 'callback_data' => "reject:{$woId}"],
                ],
            ],
        ];
    }

    public function approve(WorkOrder $workOrder, User $approver, ?string $comment = null, ?string $completionTargetDate = null): WorkOrder
    {
        $role = $approver->getRoleNames()->first();
        $reviewerRole = $this->reviewerRole($workOrder, $workOrder->status);

        if ($workOrder->status === 'pending_dept_head' && $role === $reviewerRole) {
            if ($reviewerRole === 'dept-head' && $approver->department_id !== $workOrder->requester->department_id) {
                throw ValidationException::withMessages([
                    'approver' => 'Dept head can only approve requests from their own department.',
                ]);
            }

            $this->recordApproval($workOrder, $approver, 1, 'approved', $comment);

            return $this->transition($workOrder, 'pending_chief_engineer');
        }

        if ($workOrder->status === 'pending_chief_engineer' && $role === 'chief-engineer') {
            if (! $completionTargetDate) {
                throw ValidationException::withMessages([
                    'completion_target_date' => 'Completion target date is required before approving.',
                ]);
            }

            $workOrder->update(['completion_target_date' => $completionTargetDate]);

            $this->recordApproval($workOrder, $approver, 2, 'approved', $comment);

            return $this->transition($workOrder, 'approved');
        }

        if ($workOrder->status === 'pending_check' && $role === $reviewerRole) {
            if ($reviewerRole === 'dept-head' && $approver->department_id !== $workOrder->requester->department_id) {
                throw ValidationException::withMessages([
                    'approver' => 'Dept head can only approve requests from their own department.',
                ]);
            }

            $this->recordApproval($workOrder, $approver, 3, 'approved', $comment);

            return $this->transition($workOrder, 'completed');
        }

        throw ValidationException::withMessages([
            'approver' => 'You are not authorized to approve this work order at its current status.',
        ]);
    }

    public function reject(WorkOrder $workOrder, User $approver, string $comment): WorkOrder
    {
        if (empty(trim($comment))) {
            throw ValidationException::withMessages([
                'comment' => 'A comment is required when rejecting a work order.',
            ]);
        }

        $role = $approver->getRoleNames()->first();
        $reviewerRole = $this->reviewerRole($workOrder, $workOrder->status);

        if ($workOrder->status === 'pending_dept_head' && $role === $reviewerRole) {
            $this->recordApproval($workOrder, $approver, 1, 'rejected', $comment);

            return $this->transition($workOrder, 'rejected');
        }

        if ($workOrder->status === 'pending_chief_engineer' && $role === 'chief-engineer') {
            $this->recordApproval($workOrder, $approver, 2, 'rejected', $comment);

            return $this->transition($workOrder, 'rejected');
        }

        if ($workOrder->status === 'pending_check' && $role === $reviewerRole) {
            if ($reviewerRole === 'dept-head' && $approver->department_id !== $workOrder->requester->department_id) {
                throw ValidationException::withMessages([
                    'approver' => 'Dept head can only reject requests from their own department.',
                ]);
            }

            $this->recordApproval($workOrder, $approver, 3, 'rejected', $comment);

            return $this->transition($workOrder, 'in_progress');
        }

        throw ValidationException::withMessages([
            'approver' => 'You are not authorized to reject this work order at its current status.',
        ]);
    }

    public function assign(WorkOrder $workOrder, User $assigner, int $technicianId, string $scheduledDate, string $shift): WorkOrder
    {
        if (! in_array('assigned', $this->allowedTransitions($workOrder->status), true)) {
            throw ValidationException::withMessages([
                'status' => 'Work order must be approved before assigning a technician.',
            ]);
        }

        $workOrder->technicianAssignments()->create([
            'technician_id' => $technicianId,
            'scheduled_date' => $scheduledDate,
            'shift' => $shift,
            'status' => 'assigned',
        ]);

        return $this->transition($workOrder, 'assigned');
    }

    private function recordApproval(WorkOrder $workOrder, User $approver, int $level, string $action, ?string $comment): void
    {
        WorkOrderApproval::create([
            'work_order_id' => $workOrder->id,
            'approver_id' => $approver->id,
            'level' => $level,
            'action' => $action,
            'comment' => $comment,
        ]);
    }
}
