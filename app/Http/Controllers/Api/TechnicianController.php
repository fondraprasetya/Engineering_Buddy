<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RosterEntry;
use App\Models\TechnicianAssignment;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TechnicianController extends Controller
{
    public function myTasks(Request $request): JsonResponse
    {
        $user = $request->user();

        $workOrders = WorkOrder::whereHas('technicianAssignments', fn ($q) => $q->where('technician_id', $user->id))
            ->with([
                'asset:id,name,code',
                'technicianAssignments' => fn ($q) => $q->where('technician_id', $user->id),
                'checklistResponses.field',
            ])
            ->whereIn('status', ['assigned', 'in_progress'])
            ->latest()
            ->get();

        return response()->json($workOrders);
    }

    public function schedule(Request $request): JsonResponse
    {
        $user = $request->user();

        $assignments = $user->technicianAssignments()
            ->with('workOrder:id,title,status,priority')
            ->where('scheduled_date', '>=', now()->subDay())
            ->orderBy('scheduled_date')
            ->get();

        return response()->json($assignments);
    }

    public function scheduleByTechnician(Request $request, User $user): JsonResponse
    {
        abort_unless($request->user()->can('assign technician'), 403);

        $assignments = $user->technicianAssignments()
            ->with('workOrder:id,title,status,priority')
            ->where('scheduled_date', '>=', now()->subDay())
            ->orderBy('scheduled_date')
            ->get();

        return response()->json($assignments);
    }

    public function available(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('assign technician'), 403);

        $validated = $request->validate([
            'date' => 'required|date',
            'shift' => 'required|in:morning,afternoon,night',
        ]);

        $date = $validated['date'];
        $shift = $validated['shift'];

        $roster = RosterEntry::where('date', $date)
            ->whereIn('shift', ['morning', 'afternoon', 'night'])
            ->pluck('user_id');

        $onDutyIds = RosterEntry::where('date', $date)
            ->where('shift', $shift)
            ->pluck('user_id');

        $offIds = RosterEntry::where('date', $date)
            ->whereIn('shift', ['off', 'leave', 'extra_off'])
            ->pluck('user_id');

        $assignedIds = TechnicianAssignment::where('scheduled_date', $date)
            ->where('shift', $shift)
            ->pluck('technician_id');

        $available = User::role('technician')
            ->select('id', 'name')
            ->whereNotIn('id', $offIds)
            ->whereNotIn('id', $assignedIds)
            ->where(function ($q) use ($roster, $onDutyIds) {
                $q->whereNotIn('id', $roster)
                    ->orWhereIn('id', $onDutyIds);
            })
            ->orderBy('name')
            ->get();

        return response()->json($available);
    }
}
