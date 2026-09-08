<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\DailyUtility;
use App\Models\MaintenanceSchedule;
use App\Models\MonthlyBudget;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\MaintenanceScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    protected function dateFormatSql(string $column): string
    {
        return DB::connection()->getDriverName() === 'mysql'
            ? "DATE_FORMAT($column, '%Y-%m')"
            : "strftime('%Y-%m', $column)";
    }

    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $user->roles?->first() ?? 'employee';

        $workOrdersByStatus = WorkOrder::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $monthlyTrend = WorkOrder::selectRaw($this->dateFormatSql('created_at').' as month, count(*) as created')
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $completedMonthly = WorkOrder::whereNotNull('completed_at')
            ->selectRaw($this->dateFormatSql('completed_at').' as month, count(*) as completed')
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $allMonths = collect();
        $months = $monthlyTrend->keys()->merge($completedMonthly->keys())->unique()->sort();
        foreach ($months as $m) {
            $allMonths->push([
                'month' => $m,
                'created' => (int) ($monthlyTrend[$m]->created ?? 0),
                'completed' => (int) ($completedMonthly[$m]->completed ?? 0),
            ]);
        }

        $priorityDistribution = WorkOrder::selectRaw('priority, count(*) as count')
            ->groupBy('priority')
            ->pluck('count', 'priority');

        $monthStart = now()->startOfMonth();
        $monthEnd = now()->endOfMonth();

        $monthlyBudget = MonthlyBudget::where('year', now()->year)
            ->where('month', now()->month)
            ->sum('amount');

        $costOverview = [
            'total_budget' => (float) $monthlyBudget,
            'total_actual' => (float) Project::whereBetween('created_at', [$monthStart, $monthEnd])->sum('budget_actual'),
        ];

        $completedPm = WorkOrder::where('title', 'like', '[PM] %')
            ->whereIn('status', ['completed', 'closed'])
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->count();

        $scheduledCount = MaintenanceSchedule::active()
            ->where('next_due_date', '>=', today())
            ->count();

        $assetStats = [
            'total_assets' => Asset::count(),
            'active_schedules' => MaintenanceSchedule::active()->count(),
            'overdue_schedules' => app(MaintenanceScheduleService::class)->getOverdueCount(),
            'maintenance_completed' => $completedPm,
            'maintenance_scheduled' => $scheduledCount,
        ];

        $pendingApprovals = match ($role) {
            'dept-head' => WorkOrder::whereIn('status', ['pending_dept_head', 'pending_check', 'pending_close'])
                ->whereHas('requester', fn ($q) => $q
                    ->where('department_id', $user->department_id)
                    ->whereDoesntHave('roles', fn ($r) => $r->where('name', 'technician')))
                ->count(),
            'chief-engineer' => WorkOrder::where('status', 'pending_chief_engineer')
                ->orWhere(function ($q) {
                    $q->whereIn('status', ['pending_dept_head', 'pending_check', 'pending_close'])
                        ->whereHas('requester', fn ($r) => $r->whereHas('roles', fn ($role) => $role->where('name', 'technician')));
                })
                ->count(),
            default => 0,
        };

        $myPendingTasks = match ($role) {
            'technician' => WorkOrder::whereIn('status', ['assigned', 'in_progress'])
                ->whereHas('technicianAssignments', fn ($q) => $q->where('technician_id', $user->id))
                ->count(),
            'employee' => WorkOrder::where('requester_id', $user->id)
                ->whereIn('status', ['draft', 'pending_dept_head', 'pending_chief_engineer', 'approved', 'in_progress', 'pending_check', 'pending_close'])
                ->count(),
            default => 0,
        };

        $yesterday = today()->subDay();

        $today = DailyUtility::whereIn('type', ['electricity', 'water', 'gas'])
            ->whereDate('record_date', $yesterday)
            ->groupBy('type')
            ->selectRaw('type, COALESCE(SUM(consumption),0) as consumption, COALESCE(SUM(cost),0) as cost')
            ->get()
            ->keyBy('type');

        $month = DailyUtility::whereIn('type', ['electricity', 'water', 'gas'])
            ->whereBetween('record_date', [now()->startOfMonth(), $yesterday])
            ->groupBy('type')
            ->selectRaw('type, COALESCE(SUM(consumption),0) as consumption, COALESCE(SUM(cost),0) as cost')
            ->get()
            ->keyBy('type');

        $year = DailyUtility::whereIn('type', ['electricity', 'water', 'gas'])
            ->whereBetween('record_date', [now()->startOfYear(), $yesterday])
            ->groupBy('type')
            ->selectRaw('type, COALESCE(SUM(consumption),0) as consumption, COALESCE(SUM(cost),0) as cost')
            ->get()
            ->keyBy('type');

        $lastYearTodayData = DailyUtility::whereIn('type', ['electricity', 'water', 'gas'])
            ->whereDate('record_date', $yesterday->subYear())
            ->groupBy('type')
            ->selectRaw('type, COALESCE(SUM(consumption),0) as consumption, COALESCE(SUM(cost),0) as cost')
            ->get()
            ->keyBy('type');

        $lastYearMonth = DailyUtility::whereIn('type', ['electricity', 'water', 'gas'])
            ->whereBetween('record_date', [now()->subYear()->startOfMonth(), now()->subYear()->endOfMonth()])
            ->groupBy('type')
            ->selectRaw('type, COALESCE(SUM(consumption),0) as consumption, COALESCE(SUM(cost),0) as cost')
            ->get()
            ->keyBy('type');

        $lastYearYear = DailyUtility::whereIn('type', ['electricity', 'water', 'gas'])
            ->whereBetween('record_date', [now()->subYear()->startOfYear(), now()->subYear()->endOfDay()])
            ->groupBy('type')
            ->selectRaw('type, COALESCE(SUM(consumption),0) as consumption, COALESCE(SUM(cost),0) as cost')
            ->get()
            ->keyBy('type');

        $energy = [];
        foreach (['electricity' => 'kWh', 'water' => 'm³', 'gas' => 'm³'] as $type => $unit) {
            $energy[] = [
                'type' => ucfirst($type),
                'unit' => $unit,
                'today' => ['consumption' => (float) ($today[$type]->consumption ?? 0), 'cost' => (float) ($today[$type]->cost ?? 0)],
                'month' => ['consumption' => (float) ($month[$type]->consumption ?? 0), 'cost' => (float) ($month[$type]->cost ?? 0)],
                'year' => ['consumption' => (float) ($year[$type]->consumption ?? 0), 'cost' => (float) ($year[$type]->cost ?? 0)],
                'lastYear' => [
                    'today' => ['consumption' => (float) ($lastYearTodayData[$type]->consumption ?? 0), 'cost' => (float) ($lastYearTodayData[$type]->cost ?? 0)],
                    'month' => ['consumption' => (float) ($lastYearMonth[$type]->consumption ?? 0), 'cost' => (float) ($lastYearMonth[$type]->cost ?? 0)],
                    'year' => ['consumption' => (float) ($lastYearYear[$type]->consumption ?? 0), 'cost' => (float) ($lastYearYear[$type]->cost ?? 0)],
                ],
            ];
        }

        $topPerformers = User::role('technician')
            ->select('users.id', 'users.name')
            ->selectRaw('COUNT(DISTINCT wo.id) as completed_count')
            ->selectRaw('COALESCE(ROUND(AVG(wo.technician_rating), 1), 0) as avg_rating')
            ->join('technician_assignments as ta', 'ta.technician_id', '=', 'users.id')
            ->join('work_orders as wo', 'wo.id', '=', 'ta.work_order_id')
            ->whereIn('wo.status', ['completed', 'closed'])
            ->whereNotNull('wo.technician_rating')
            ->groupBy('users.id', 'users.name')
            ->orderByRaw('completed_count DESC, avg_rating DESC')
            ->take(5)
            ->get()
            ->toArray();

        return response()->json([
            'workOrdersByStatus' => $workOrdersByStatus,
            'monthlyTrend' => $allMonths->values(),
            'priorityDistribution' => $priorityDistribution,
            'costOverview' => $costOverview,
            'assetStats' => $assetStats,
            'pendingApprovals' => $pendingApprovals,
            'myPendingTasks' => $myPendingTasks,
            'topPerformers' => $topPerformers,
            'energy' => $energy,
        ]);
    }
}
