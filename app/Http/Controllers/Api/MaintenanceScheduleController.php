<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceSchedule;
use App\Services\MaintenanceScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaintenanceScheduleController extends Controller
{
    public function __construct(
        private readonly MaintenanceScheduleService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage maintenance schedules'), 403);

        return response()->json(
            MaintenanceSchedule::with(['asset:id,name,code', 'checklistTemplate:id,name', 'defaultTechnician:id,name', 'workOrder:id,status,title'])
                ->latest()
                ->paginate(20)
        );
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage maintenance schedules'), 403);

        $validated = $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'checklist_template_id' => 'nullable|exists:checklist_templates,id',
            'frequency_type' => 'required|in:daily,weekly,monthly,quarterly,bi-annual,annual,fixed_days,calendar,usage',
            'frequency_value' => 'required|integer|min:1',
            'next_due_date' => 'required|date',
            'default_technician_id' => 'nullable|exists:users,id',
        ]);

        return response()->json(MaintenanceSchedule::create($validated), 201);
    }

    public function show(MaintenanceSchedule $maintenanceSchedule): JsonResponse
    {
        return response()->json(
            $maintenanceSchedule->load(['asset:id,name,code', 'checklistTemplate:id,name', 'defaultTechnician:id,name', 'workOrder:id,status,title'])
        );
    }

    public function update(Request $request, MaintenanceSchedule $maintenanceSchedule): JsonResponse
    {
        abort_unless($request->user()->can('manage maintenance schedules'), 403);

        $validated = $request->validate([
            'asset_id' => 'sometimes|exists:assets,id',
            'checklist_template_id' => 'nullable|exists:checklist_templates,id',
            'frequency_type' => 'sometimes|in:daily,weekly,monthly,quarterly,bi-annual,annual,fixed_days,calendar,usage',
            'frequency_value' => 'sometimes|integer|min:1',
            'next_due_date' => 'sometimes|date',
            'default_technician_id' => 'nullable|exists:users,id',
        ]);

        $maintenanceSchedule->update($validated);

        return response()->json($maintenanceSchedule->fresh()->load(['asset:id,name,code', 'checklistTemplate:id,name', 'defaultTechnician:id,name', 'workOrder:id,status,title']));
    }

    public function overdueCount(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage maintenance schedules'), 403);

        return response()->json([
            'count' => $this->service->getOverdueCount(),
        ]);
    }

    public function toggleActive(MaintenanceSchedule $maintenanceSchedule): JsonResponse
    {
        abort_unless(request()->user()->can('manage maintenance schedules'), 403);

        $maintenanceSchedule->update(['is_active' => ! $maintenanceSchedule->is_active]);

        return response()->json([
            'message' => $maintenanceSchedule->is_active ? 'Schedule activated.' : 'Schedule inactivated.',
            'schedule' => $maintenanceSchedule->fresh()->load(['asset:id,name,code', 'checklistTemplate:id,name', 'defaultTechnician:id,name', 'workOrder:id,status,title']),
        ]);
    }
}
