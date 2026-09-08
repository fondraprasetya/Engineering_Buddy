<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetHistoryController extends Controller
{
    public function __invoke(Request $request, Asset $asset): JsonResponse
    {
        $asset->load([
            'workOrders' => function ($q) use ($request) {
                $q->with(['requester:id,name', 'approvals.approver:id,name', 'expenses'])
                    ->when($request->date_from, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
                    ->when($request->date_to, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
                    ->latest();
            },
            'workOrders.checklistResponses.field',
            'maintenanceSchedules',
            'projects' => fn ($q) => $q->with('creator:id,name')->latest(),
        ]);

        $dailyLogs = $asset->workOrders()
            ->with('dailyLogs.technician:id,name')
            ->get()
            ->pluck('dailyLogs')
            ->flatten()
            ->sortByDesc('log_date')
            ->values();

        $expenses = $asset->workOrders->pluck('expenses')->flatten()->sortByDesc('expense_date')->values();

        return response()->json([
            'asset' => $asset->only(['id', 'name', 'code', 'category', 'location', 'status']),
            'work_orders' => $asset->workOrders,
            'maintenance_schedules' => $asset->maintenanceSchedules,
            'daily_logs' => $dailyLogs,
            'expenses' => $expenses,
            'projects' => $asset->projects,
        ]);
    }
}
