<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkOrder;
use App\Models\WorkOrderPhoto;
use App\Services\WorkOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkOrderController extends Controller
{
    public function __construct(
        private readonly WorkOrderService $workOrderService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $user->getRoleNames()->first();

        $query = WorkOrder::with(['requester:id,name', 'asset:id,name', 'location:id,name,code', 'approvals.approver:id,name']);

        if ($role === 'employee') {
            $query->where('requester_id', $user->id);
        } elseif ($role === 'dept-head') {
            $query->whereHas('requester', fn ($q) => $q->where('department_id', $user->department_id));
        } elseif ($role === 'technician') {
            $query->whereHas('technicianAssignments', fn ($q) => $q->where('technician_id', $user->id));
        } elseif ($role === 'gm') {
            $query->whereIn('status', ['completed', 'closed']);
        }

        return response()->json($query->latest()->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('create work orders'), 403);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'asset_id' => 'nullable|exists:assets,id',
            'location_id' => 'nullable|exists:locations,id',
            'priority' => 'required|in:low,medium,high,urgent',
            'project_id' => 'nullable|exists:projects,id',
            'actual_cost' => 'nullable|numeric|min:0',
        ]);

        $workOrder = WorkOrder::create([
            ...$validated,
            'requester_id' => $request->user()->id,
            'status' => 'pending_dept_head',
        ]);

        if ($workOrder->project_id) {
            $workOrder->syncProjectBudget();
        }

        return response()->json($workOrder->load('requester:id,name'), 201);
    }

    public function show(WorkOrder $workOrder): JsonResponse
    {
        return response()->json(
            $workOrder->load([
                'requester:id,name,department_id',
                'requester.department:id,name',
                'asset:id,name,code',
                'location:id,name,code',
                'project:id,name,budget_planned,budget_actual',
                'approvals.approver:id,name,department_id',
                'approvals.approver.department:id,name',
                'technicianAssignments.technician:id,name',
            ])
        );
    }

    public function approve(Request $request, WorkOrder $workOrder): JsonResponse
    {
        abort_unless($request->user()->can('approve dept head') || $request->user()->can('approve chief engineer'), 403);

        $validated = $request->validate([
            'comment' => 'nullable|string',
            'completion_target_date' => 'nullable|date',
        ]);

        $this->workOrderService->approve(
            $workOrder,
            $request->user(),
            $validated['comment'] ?? null,
            $validated['completion_target_date'] ?? null,
        );

        return response()->json(['message' => 'Work order approved.', 'work_order' => $workOrder->fresh()->load('approvals')]);
    }

    public function reject(Request $request, WorkOrder $workOrder): JsonResponse
    {
        abort_unless($request->user()->can('approve dept head') || $request->user()->can('approve chief engineer'), 403);

        $validated = $request->validate(['comment' => 'required|string']);

        $this->workOrderService->reject($workOrder, $request->user(), $validated['comment']);

        return response()->json(['message' => 'Work order rejected.', 'work_order' => $workOrder->fresh()->load('approvals')]);
    }

    public function assign(Request $request, WorkOrder $workOrder): JsonResponse
    {
        abort_unless($request->user()->can('assign technician'), 403);

        $validated = $request->validate([
            'technician_id' => 'required|exists:users,id',
            'scheduled_date' => 'required|date',
            'shift' => 'required|in:morning,afternoon,night',
        ]);

        $this->workOrderService->assign(
            $workOrder,
            $request->user(),
            $validated['technician_id'],
            $validated['scheduled_date'],
            $validated['shift'],
        );

        return response()->json(['message' => 'Technician assigned.', 'work_order' => $workOrder->fresh()->load('technicianAssignments.technician:id,name')]);
    }

    public function saveProgress(Request $request, WorkOrder $workOrder): JsonResponse
    {
        abort_unless($request->user()->can('update task status'), 403);
        abort_unless($workOrder->technicianAssignments()->where('technician_id', $request->user()->id)->exists(), 403);

        $validated = $request->validate([
            'technician_notes' => 'nullable|string|max:5000',
            'completion_photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        if ($request->filled('technician_notes')) {
            $existing = $workOrder->technician_notes;
            $timestamp = now('Asia/Jakarta')->format('d M Y H:i');
            $entry = "\n--- [$timestamp WIB] ---\n".$validated['technician_notes'];
            $workOrder->technician_notes = $existing ? $existing.$entry : $validated['technician_notes'];
        }

        if ($request->hasFile('completion_photo')) {
            $workOrder->completion_photo = $request->file('completion_photo')->store('work-order-photos', 'public');
        }

        if ($workOrder->isDirty()) {
            $workOrder->save();
        }

        return response()->json(['message' => 'Progress saved.', 'work_order' => $workOrder->fresh()]);
    }

    public function uploadPhoto(Request $request, WorkOrder $workOrder): JsonResponse
    {
        abort_unless($request->user()->can('update task status'), 403);
        abort_unless($workOrder->technicianAssignments()->where('technician_id', $request->user()->id)->exists(), 403);

        $validated = $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'type' => 'sometimes|in:progress,completion',
        ]);

        $path = $request->file('photo')->store('work-order-photos', 'public');

        $photo = WorkOrderPhoto::create([
            'work_order_id' => $workOrder->id,
            'photo_path' => $path,
            'type' => $validated['type'] ?? 'progress',
        ]);

        return response()->json(['message' => 'Photo uploaded.', 'photo' => $photo], 201);
    }

    public function deletePhoto(Request $request, WorkOrderPhoto $photo): JsonResponse
    {
        abort_unless($request->user()->can('update task status'), 403);

        $photo->delete();

        return response()->json(['message' => 'Photo deleted.']);
    }

    public function updateStatus(Request $request, WorkOrder $workOrder): JsonResponse
    {
        abort_unless($request->user()->can('update task status'), 403);

        $validated = $request->validate([
            'status' => 'required|in:in_progress,pending_check,completed,pending_close,closed',
            'technician_notes' => 'nullable|string|max:5000',
            'completion_photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'technician_rating' => 'nullable|integer|min:1|max:5',
        ]);

        if ($validated['status'] === 'pending_check') {
            if ($request->hasFile('completion_photo')) {
                $validated['completion_photo'] = $request->file('completion_photo')->store('work-order-photos', 'public');
            } else {
                $firstPhoto = $workOrder->photos()->where('type', 'completion')->first();
                if ($firstPhoto) {
                    $validated['completion_photo'] = $firstPhoto->photo_path;
                } else {
                    return response()->json(['message' => 'Completion photo is required.', 'errors' => ['completion_photo' => ['Please attach a photo before marking complete.']]], 422);
                }
            }

            if (empty($validated['technician_notes']) && empty($workOrder->technician_notes)) {
                return response()->json(['message' => 'Progress note is required.', 'errors' => ['technician_notes' => ['Please add a progress note before marking complete.']]], 422);
            }

            $update = [];
            if (! empty($validated['technician_notes'])) {
                $existing = $workOrder->technician_notes;
                $timestamp = now('Asia/Jakarta')->format('d M Y H:i');
                $entry = "\n--- [$timestamp WIB] ---\n".$validated['technician_notes'];
                $update['technician_notes'] = $existing ? $existing.$entry : $validated['technician_notes'];
            }
            $update['completion_photo'] = $validated['completion_photo'];
            $workOrder->update($update);
        }

        if ($validated['status'] === 'completed') {
            if (empty($validated['technician_rating'])) {
                return response()->json(['message' => 'Technician rating is required.', 'errors' => ['technician_rating' => ['Please rate the technician before approving completion.']]], 422);
            }
            $workOrder->update(['technician_rating' => $validated['technician_rating']]);
        }

        $this->workOrderService->transition($workOrder, $validated['status']);

        return response()->json(['message' => 'Status updated.', 'work_order' => $workOrder->fresh()]);
    }

    public function updateCost(Request $request, WorkOrder $workOrder): JsonResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $validated = $request->validate([
            'actual_cost' => 'required|numeric|min:0',
        ]);

        $workOrder->update($validated);
        $workOrder->syncProjectBudget();

        return response()->json(['message' => 'Cost updated.', 'work_order' => $workOrder->fresh()]);
    }
}
