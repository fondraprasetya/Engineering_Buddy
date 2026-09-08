<?php

namespace App\Http\Controllers;

use App\Models\ActualExpense;
use App\Models\Asset;
use App\Models\CalendarEvent;
use App\Models\DailyUtility;
use App\Models\DashboardSetting;
use App\Models\MaintenanceSchedule;
use App\Models\MonthlyBudget;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\RosterEntry;
use App\Models\TechnicianAssignment;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderApproval;
use App\Services\MaintenanceScheduleService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    protected function dateFormatSql(string $column): string
    {
        return DB::connection()->getDriverName() === 'mysql'
            ? "DATE_FORMAT($column, '%Y-%m')"
            : "strftime('%Y-%m', $column)";
    }

    public function __invoke(Request $request)
    {
        $user = $request->user();
        $role = $user->roles?->first() ?? 'employee';
        $overdueCount = app(MaintenanceScheduleService::class)->getOverdueCount();

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
        $start = now()->subMonths(11)->startOfMonth();
        for ($d = $start->copy(); $d <= now(); $d->addMonth()) {
            $m = $d->format('Y-m');
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

        $energyCost = (float) DailyUtility::whereBetween('record_date', [$monthStart, $monthEnd])->sum('cost');
        $projectActual = (float) Project::whereBetween('created_at', [$monthStart, $monthEnd])->sum('budget_actual');
        $maintenanceCost = (float) WorkOrder::whereBetween('created_at', [$monthStart, $monthEnd])->sum('actual_cost');
        $projectExpenses = (float) ActualExpense::where('status', 'actual')
            ->whereNotNull('project_id')
            ->where('document_ref', '!=', 'Auto from budget')
            ->whereBetween('expense_date', [$monthStart, $monthEnd])
            ->sum('amount');
        $woExpenses = (float) ActualExpense::where('status', 'actual')
            ->whereNull('project_id')
            ->whereNotNull('work_order_id')
            ->where('document_ref', '!=', 'Auto from budget')
            ->whereBetween('expense_date', [$monthStart, $monthEnd])
            ->sum('amount');
        $scheduleExpenses = (float) ActualExpense::where('status', 'actual')
            ->whereNull('project_id')
            ->whereNull('work_order_id')
            ->whereNotNull('maintenance_schedule_id')
            ->where('document_ref', '!=', 'Auto from budget')
            ->whereBetween('expense_date', [$monthStart, $monthEnd])
            ->sum('amount');
        $orphanExpenses = (float) ActualExpense::where('status', 'actual')
            ->whereNull('project_id')
            ->whereNull('work_order_id')
            ->whereNull('maintenance_schedule_id')
            ->where('document_ref', '!=', 'Auto from budget')
            ->whereBetween('expense_date', [$monthStart, $monthEnd])
            ->sum('amount');
        $breakdown = [
            'Energy' => $energyCost,
            'Projects' => $projectActual + $projectExpenses,
            'Maintenance' => $maintenanceCost + $woExpenses + $scheduleExpenses,
            'Expenses' => $orphanExpenses,
        ];
        $totalActual = array_sum($breakdown);

        $monthlyBudget = MonthlyBudget::where('year', now()->year)
            ->where('month', now()->month)
            ->sum('amount');

        $costOverview = [
            'total_budget' => (float) $monthlyBudget,
            'total_actual' => $totalActual,
            'breakdown' => $breakdown,
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
            'overdue_schedules' => $overdueCount,
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
            ->select('users.id', 'users.name', 'users.photo')
            ->selectRaw('COUNT(DISTINCT wo.id) as completed_count')
            ->selectRaw('COALESCE(ROUND(AVG(wo.technician_rating), 1), 0) as avg_rating')
            ->join('technician_assignments as ta', 'ta.technician_id', '=', 'users.id')
            ->join('work_orders as wo', 'wo.id', '=', 'ta.work_order_id')
            ->whereIn('wo.status', ['completed', 'closed'])
            ->whereNotNull('wo.technician_rating')
            ->groupBy('users.id', 'users.name', 'users.photo')
            ->orderByRaw('completed_count DESC, avg_rating DESC')
            ->take(5)
            ->get()
            ->toArray();

        $todayRoster = RosterEntry::whereDate('date', today())
            ->with(['user.roles'])
            ->get();

        $todayShift = $todayRoster->first()?->shift ?? 'Morning';
        $teamMembers = $todayRoster->filter(fn ($r) => $r->user)->map(fn ($r) => [
            'id' => $r->user->id,
            'name' => $r->user->name,
            'role' => $r->user->roles->first()?->name ?? 'employee',
        ]);

        $supervisorEntry = $teamMembers->firstWhere(fn ($m) => in_array($m['role'], ['eng-admin', 'chief-engineer', 'dept-head']));
        $supervisor = $supervisorEntry ?? $teamMembers->first();

        $todayMission = MaintenanceSchedule::select('maintenance_schedules.*', 'assets.name as asset_name')
            ->leftJoin('assets', 'assets.id', '=', 'maintenance_schedules.asset_id')
            ->where(fn ($q) => $q->whereDate('next_due_date', today())->orWhereDate('next_due_date', today()->addDay()))
            ->where('is_active', true)
            ->get()
            ->map(fn ($s) => ($s->asset_name ? $s->asset_name.' — ' : '').str($s->frequency_type)->headline().' maintenance')
            ->take(3)
            ->values()
            ->toArray();

        if (empty($todayMission)) {
            $priorityWo = WorkOrder::whereIn('status', ['assigned', 'in_progress'])
                ->whereDate('created_at', '>=', today()->subDays(3))
                ->orderByRaw("CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
                ->take(3)
                ->pluck('description')
                ->filter()
                ->values()
                ->toArray();
            $todayMission = $priorityWo;
        }

        $recentCompleted = WorkOrder::whereIn('status', ['completed', 'closed'])
            ->whereNotNull('completed_at')
            ->latest('completed_at')
            ->take(5)
            ->get()
            ->map(fn ($wo) => [
                'action' => 'Work Order #WO-'.str_pad($wo->id, 4, '0', STR_PAD_LEFT).' completed — '.$wo->title,
                'time' => $wo->completed_at,
                'color' => '#22C55E',
            ]);

        $recentAssignments = TechnicianAssignment::with(['workOrder', 'technician'])
            ->latest()
            ->take(5)
            ->get()
            ->filter(fn ($ta) => $ta->workOrder)
            ->map(fn ($ta) => [
                'action' => 'Work Order #WO-'.str_pad($ta->workOrder->id, 4, '0', STR_PAD_LEFT).' assigned to '.($ta->technician->name ?? 'technician'),
                'time' => $ta->created_at,
                'color' => '#F59E0B',
            ]);

        $recentApprovals = WorkOrderApproval::with(['workOrder', 'approver'])
            ->where('action', 'approved')
            ->latest()
            ->take(5)
            ->get()
            ->filter(fn ($a) => $a->workOrder)
            ->map(fn ($a) => [
                'action' => 'Work Order #WO-'.str_pad($a->workOrder->id, 4, '0', STR_PAD_LEFT).' approved by '.($a->approver->name ?? 'approver'),
                'time' => $a->created_at,
                'color' => '#8B5CF6',
            ]);

        $recentProjects = Project::latest()
            ->take(3)
            ->get()
            ->map(fn ($p) => [
                'action' => 'Project "'.$p->name.'" '.($p->status === 'completed' ? 'completed' : 'created'),
                'time' => $p->status === 'completed' ? $p->updated_at : $p->created_at,
                'color' => '#3B82F6',
            ]);

        $recentActivities = collect()
            ->merge($recentCompleted)
            ->merge($recentAssignments)
            ->merge($recentApprovals)
            ->merge($recentProjects)
            ->sortByDesc('time')
            ->take(8)
            ->map(fn ($a) => [
                'action' => $a['action'],
                'time' => $a['time'] instanceof Carbon ? $a['time']->diffForHumans() : Carbon::parse($a['time'])->diffForHumans(),
                'color' => $a['color'],
            ])
            ->values()
            ->toArray();

        $pendingWoCount = WorkOrder::whereIn('status', ['pending_dept_head', 'pending_chief_engineer'])->count();
        $pendingProjectCount = Project::where('status', 'active')->count();
        $pendingRosterCount = RosterEntry::pending()->count();

        $approvalQueue = [
            ['label' => 'Pending Orders', 'count' => $pendingWoCount, 'route' => '/work-orders', 'color' => '#3B82F6'],
            ['label' => 'Pending Projects', 'count' => $pendingProjectCount, 'route' => '/projects', 'color' => '#F59E0B'],
            ['label' => 'Pending Roster', 'count' => $pendingRosterCount, 'route' => '/roster', 'color' => '#8B5CF6'],
        ];

        $overdueSchedules = MaintenanceSchedule::where('is_active', true)
            ->whereDate('next_due_date', '<', today())
            ->with('asset')
            ->get()
            ->map(fn ($s) => [
                'message' => ($s->asset?->name ?? 'Schedule').' overdue by '.today()->diffInDays($s->next_due_date).' day(s)',
                'severity' => 'critical',
            ]);

        $overdueWorkOrders = WorkOrder::whereNotNull('completion_target_date')
            ->whereDate('completion_target_date', '<', today())
            ->whereNotIn('status', ['completed', 'closed', 'rejected'])
            ->take(3)
            ->get()
            ->map(fn ($wo) => [
                'message' => 'Work Order #WO-'.str_pad($wo->id, 4, '0', STR_PAD_LEFT).' ('.$wo->title.') overdue',
                'severity' => 'warning',
            ]);

        $criticalWorkOrders = WorkOrder::where('priority', 'critical')
            ->whereNotIn('status', ['completed', 'closed', 'rejected'])
            ->take(3)
            ->get()
            ->map(fn ($wo) => [
                'message' => 'Critical: '.($wo->title).' needs immediate attention',
                'severity' => 'critical',
            ]);

        $dueTomorrow = MaintenanceSchedule::whereDate('next_due_date', today()->addDay())
            ->where('is_active', true)
            ->with('asset')
            ->get()
            ->map(fn ($s) => [
                'message' => ($s->asset?->name ?? 'Schedule').' '.str($s->frequency_type)->headline().' due tomorrow',
                'severity' => 'info',
            ]);

        $alerts = collect()
            ->merge($overdueSchedules)
            ->merge($overdueWorkOrders)
            ->merge($criticalWorkOrders)
            ->merge($dueTomorrow)
            ->sortByDesc(fn ($a) => ['critical' => 0, 'warning' => 1, 'info' => 2][$a['severity']])
            ->take(8)
            ->values()
            ->toArray();

        $nextWeekStart = today();
        $nextWeekEnd = today()->addDays(7);

        $upcomingWorkOrders = WorkOrder::whereNotIn('status', ['completed', 'closed', 'rejected'])
            ->whereNotNull('completion_target_date')
            ->whereBetween('completion_target_date', [$nextWeekStart, $nextWeekEnd])
            ->select('id', 'title', 'completion_target_date', 'priority')
            ->get()
            ->map(fn ($wo) => [
                'id' => $wo->id,
                'title' => $wo->title,
                'due_date' => $wo->completion_target_date,
                'type' => 'Work Order',
            ]);

        $upcomingSchedules = MaintenanceSchedule::where('is_active', true)
            ->whereBetween('next_due_date', [$nextWeekStart, $nextWeekEnd])
            ->with('asset:id,name')
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'title' => ($s->asset?->name ?? 'Asset').' — '.str($s->frequency_type)->headline(),
                'due_date' => $s->next_due_date,
                'type' => 'Maintenance',
            ]);

        $upcomingCheckpoints = ProjectMilestone::where('status', '!=', 'completed')
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$nextWeekStart, $nextWeekEnd])
            ->with('project:id,name')
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'title' => $m->project?->name.' — '.$m->title,
                'due_date' => $m->due_date,
                'type' => 'Checkpoint',
            ]);

        $activityOfTheWeek = collect()
            ->merge($upcomingWorkOrders)
            ->merge($upcomingSchedules)
            ->merge($upcomingCheckpoints)
            ->sortBy('due_date')
            ->values()
            ->toArray();

        $dailyOccupancy = collect();
        $allStats = CalendarEvent::whereNotNull('room_occupied')
            ->orderBy('start_datetime')
            ->get()
            ->keyBy(fn ($e) => date('Y-m-d', strtotime($e->start_datetime)));
        for ($d = 0; $d <= 7; $d++) {
            $date = today()->addDays($d);
            $key = $date->toDateString();
            $event = $allStats->get($key);
            $occupied = (float) ($event?->room_occupied ?? 0);
            $available = (float) ($event?->room_available ?? 0);
            $dailyOccupancy->push([
                'date' => $key,
                'label' => $d === 0 ? 'Today' : $date->format('D'),
                'occupied' => $occupied,
                'available' => $available,
                'rate' => $available > 0 ? round(($occupied / $available) * 100) : 0,
            ]);
        }

        $upcomingEvents = CalendarEvent::whereDate('start_datetime', '>=', today())
            ->whereDate('start_datetime', '<=', today()->addDays(7))
            ->with('creator:id,name')
            ->orderBy('start_datetime')
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'title' => $e->title,
                'start' => $e->start_datetime,
                'end' => $e->end_datetime,
                'all_day' => $e->all_day,
                'color' => $e->color,
                'creator' => $e->creator?->name,
            ]);

        $widgetSettings = DashboardSetting::firstOrCreate(
            ['user_id' => $user->id],
            ['layout' => null, 'hidden' => []]
        );

        $totalWo = array_sum($workOrdersByStatus->toArray());

        $hour = now()->hour;
        $weather = [
            'temp' => $hour >= 6 && $hour < 18 ? rand(28, 34) : rand(24, 27),
            'condition' => $hour >= 6 && $hour < 18 ? 'Sunny' : 'Clear',
        ];

        return Inertia::render('Dashboard', [
            'overdueCount' => $overdueCount,
            'weather' => $weather,
            'widgetSettings' => $widgetSettings,
            'widgetData' => [
                'stats' => [
                    'totalWo' => $totalWo,
                    'totalAssets' => Asset::count(),
                    'activeSchedules' => MaintenanceSchedule::active()->count(),
                    'pending' => $myPendingTasks,
                    'monthlyTrend' => $allMonths->values(),
                    'workOrdersByStatus' => $workOrdersByStatus,
                ],
                'news' => ['occupancy' => $dailyOccupancy, 'upcomingEvents' => $upcomingEvents],
                'utility' => $energy,
                'activityOfWeek' => $activityOfTheWeek,
                'costOverview' => $costOverview,
                'workOrderTrend' => $allMonths->values(),
                'workOrdersByStatus' => [
                    'data' => $workOrdersByStatus,
                    'labels' => [
                        'draft' => 'Draft', 'pending_dept_head' => 'Pending Dept Head',
                        'pending_chief_engineer' => 'Pending Chief Eng', 'approved' => 'Approved',
                        'assigned' => 'Assigned', 'in_progress' => 'In Progress', 'pending_check' => 'Pending Check',
                        'completed' => 'Completed', 'pending_close' => 'Pending Close', 'closed' => 'Closed',
                        'rejected' => 'Rejected',
                    ],
                    'colors' => [
                        'draft' => '#9CA3AF', 'pending_dept_head' => '#F59E0B', 'pending_chief_engineer' => '#F97316',
                        'approved' => '#3B82F6', 'assigned' => '#8B5CF6', 'in_progress' => '#06B6D4',
                        'pending_check' => '#F43F5E', 'completed' => '#10B981', 'pending_close' => '#6366F1',
                        'closed' => '#6B7280', 'rejected' => '#EF4444',
                    ],
                ],
                'approvalQueue' => $approvalQueue,
                'criticalAlerts' => $alerts,
                'recentActivities' => $recentActivities,
                'topTechnicians' => $topPerformers,
                'heroOfDay' => [
                    'shift' => $todayShift,
                    'supervisor' => $supervisor['name'] ?? 'N/A',
                    'members' => $teamMembers->pluck('name')->values()->toArray(),
                    'mission' => ! empty($todayMission) ? implode('; ', $todayMission) : 'Routine maintenance & inspections',
                ],
                'complianceChart' => $assetStats,
                'assetHealthChart' => [],
            ],
        ]);
    }
}
