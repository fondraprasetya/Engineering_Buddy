<?php

namespace App\Http\Controllers;

use App\Models\WorkOrder;
use App\Services\WorkOrderService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MyTaskController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $tasks = WorkOrder::whereHas('technicianAssignments', fn ($q) => $q->where('technician_id', $user->id))
            ->with([
                'asset:id,name,code',
                'technicianAssignments' => fn ($q) => $q->where('technician_id', $user->id),
            ])
            ->whereIn('status', ['assigned', 'in_progress', 'pending_check'])
            ->latest()
            ->get();

        return Inertia::render('MyTasks/Index', ['tasks' => $tasks]);
    }

    public function show(WorkOrder $workOrder, Request $request)
    {
        $user = $request->user();

        $isAssigned = $workOrder->technicianAssignments()
            ->where('technician_id', $user->id)
            ->exists();

        abort_unless($isAssigned || $user->can('manage assets'), 403);

        $workOrder->load([
            'asset:id,name,code',
            'location:id,name,code',
            'technicianAssignments' => fn ($q) => $q->where('technician_id', $user->id),
            'checklistResponses.field',
            'requester:id,name,department_id',
            'requester.department:id,name',
            'checklistTemplate.fields',
            'photos',
        ]);

        $reviewerRole = app(WorkOrderService::class)->reviewerRole($workOrder);

        return Inertia::render('MyTasks/Show', ['workOrder' => $workOrder, 'reviewerRole' => $reviewerRole]);
    }
}
