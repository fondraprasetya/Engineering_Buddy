<?php

namespace App\Services;

use App\Models\ActualExpense;
use App\Models\Asset;
use App\Models\DailyUtility;
use App\Models\MaintenanceSchedule;
use App\Models\MonthlyBudget;
use App\Models\RosterEntry;
use App\Models\Tenant;
use App\Models\WorkOrder;
use App\Tenancy\TenantContext;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class OwnerReportService
{
    public function forMonth(Tenant $tenant, Carbon $month): array
    {
        // Scope explicitly: CLI/cron callers have no ResolveTenant middleware,
        // and without this every query would leak across tenants.
        TenantContext::set($tenant->id);
        try {
            return $this->build($tenant, $month);
        } finally {
            TenantContext::clear();
        }
    }

    private function build(Tenant $tenant, Carbon $month): array
    {
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();
        $daysInMonth = $start->daysInMonth;

        $created = WorkOrder::whereBetween('created_at', [$start, $end])->count();
        $completed = WorkOrder::whereIn('status', ['completed', 'closed'])
            ->whereBetween('completed_at', [$start, $end])->count();
        $openCritical = WorkOrder::whereIn('priority', ['critical', 'high'])
            ->whereNotIn('status', ['completed', 'closed', 'rejected'])->count();

        $avgDays = WorkOrder::whereIn('status', ['completed', 'closed'])
            ->whereBetween('completed_at', [$start, $end])
            ->selectRaw('AVG(DATEDIFF(completed_at, created_at)) as avg_days')
            ->value('avg_days');

        $byStatus = WorkOrder::whereBetween('created_at', [$start, $end])
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')->pluck('count', 'status');

        $maintenanceCost = (float) WorkOrder::whereBetween('created_at', [$start, $end])->sum('actual_cost');
        $energyCost = (float) DailyUtility::whereBetween('record_date', [$start, $end])->sum('cost');
        $otherExpenses = (float) ActualExpense::where('status', 'actual')
            ->whereBetween('expense_date', [$start, $end])->sum('amount');
        $projectActual = (float) \App\Models\Project::whereBetween('created_at', [$start, $end])->sum('budget_actual');
        $budget = (float) MonthlyBudget::where('year', $start->year)->where('month', $start->month)->sum('amount');
        $totalActual = $maintenanceCost + $energyCost + $otherExpenses + $projectActual;

        $utilities = DailyUtility::whereIn('type', ['electricity', 'water', 'gas'])
            ->whereBetween('record_date', [$start, $end])
            ->selectRaw('type, COALESCE(SUM(consumption),0) as consumption, COALESCE(SUM(cost),0) as cost')
            ->groupBy('type')->get()->keyBy('type');

        $repeatOffenders = WorkOrder::whereBetween('work_orders.created_at', [$start, $end])
            ->whereNotNull('work_orders.asset_id')
            ->join('assets', 'assets.id', '=', 'work_orders.asset_id')
            ->selectRaw('assets.name as asset, COUNT(*) as tickets')
            ->groupBy('assets.name')->orderByDesc('tickets')->take(5)->get();

        $overduePm = app(MaintenanceScheduleService::class)->getOverdueCount();

        $morningsCovered = RosterEntry::where('shift', 'morning')
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('COUNT(DISTINCT date) as days')->value('days') ?? 0;

        return [
            'tenant' => $tenant->only('id', 'name'),
            'period' => $start->format('F Y'),
            'generated_at' => now()->format('d M Y H:i'),
            'kpis' => [
                'tickets_created' => $created,
                'tickets_completed' => $completed,
                'completion_pct' => $created > 0 ? round($completed / $created * 100) : 0,
                'avg_days_to_close' => $avgDays !== null ? round((float) $avgDays, 1) : null,
                'open_critical' => $openCritical,
                'overdue_pm' => $overduePm,
                'mornings_covered' => (int) $morningsCovered.'/'.$daysInMonth,
            ],
            'by_status' => $byStatus,
            'costs' => [
                'maintenance' => $maintenanceCost,
                'energy' => $energyCost,
                'projects' => $projectActual,
                'other' => $otherExpenses,
                'total' => $totalActual,
                'budget' => $budget,
                'variance' => $budget - $totalActual,
            ],
            'utilities' => $utilities,
            'repeat_offenders' => $repeatOffenders,
        ];
    }
}
