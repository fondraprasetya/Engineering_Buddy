<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\ChecklistTemplate;
use App\Models\MaintenanceSchedule;
use App\Models\User;
use App\Services\MaintenanceScheduleService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MaintenanceScheduleController extends Controller
{
    public function __construct(
        private readonly MaintenanceScheduleService $service,
    ) {}

    public function index(Request $request)
    {
        abort_unless($request->user()->can('manage maintenance schedules'), 403);

        $month = $request->input('month', now()->format('Y-m'));
        $status = $request->input('status', 'all');

        $query = MaintenanceSchedule::with([
            'asset:id,name,code',
            'checklistTemplate:id,name',
            'defaultTechnician:id,name',
            'workOrder:id,status,title',
        ]);

        $query->whereMonth('next_due_date', Carbon::parse($month)->month)
            ->whereYear('next_due_date', Carbon::parse($month)->year);

        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        $schedules = $query->orderBy('next_due_date')->get();

        $grouped = $schedules->groupBy(fn ($s) => $s->asset ? $s->asset->name.' ('.$s->asset->code.')' : 'Unknown');

        $inactiveCount = MaintenanceSchedule::where('is_active', false)->count();
        $overdueCount = $this->service->getOverdueCount();
        $selectedMonth = $month;
        $selectedStatus = $status;

        return Inertia::render('MaintenanceSchedules/Index', [
            'grouped' => $grouped,
            'overdueCount' => $overdueCount,
            'inactiveCount' => $inactiveCount,
            'selectedMonth' => $selectedMonth,
            'selectedStatus' => $selectedStatus,
        ]);
    }

    public function create()
    {
        $assets = Asset::select('id', 'name', 'code')->get();
        $templates = ChecklistTemplate::where('is_archived', false)->select('id', 'name')->get();
        $technicians = User::role('technician')->select('id', 'name')->get();

        return Inertia::render('MaintenanceSchedules/Create', [
            'assets' => $assets,
            'templates' => $templates,
            'technicians' => $technicians,
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->can('manage maintenance schedules'), 403);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'asset_id' => 'required|exists:assets,id',
            'checklist_template_id' => 'nullable|exists:checklist_templates,id',
            'frequency_type' => 'required|in:daily,weekly,monthly,quarterly,bi-annual,annual,fixed_days,calendar,usage',
            'frequency_value' => 'required|integer|min:1',
            'next_due_date' => 'required|date',
            'default_technician_id' => 'nullable|exists:users,id',
            'occurrences' => 'integer|min:1|max:52',
        ]);

        $occurrences = (int) ($validated['occurrences'] ?? 1);
        $dates = $this->calculateDates(
            $validated['frequency_type'],
            $validated['frequency_value'],
            $validated['next_due_date'],
            $occurrences
        );

        unset($validated['occurrences']);

        foreach ($dates as $date) {
            MaintenanceSchedule::create(array_merge($validated, ['next_due_date' => $date]));
        }

        return redirect('/maintenance-schedules')->with('success', "{$occurrences} schedule(s) created.");
    }

    public function edit(MaintenanceSchedule $maintenanceSchedule)
    {
        $assets = Asset::select('id', 'name', 'code')->get();
        $templates = ChecklistTemplate::where('is_archived', false)->select('id', 'name')->get();
        $technicians = User::role('technician')->select('id', 'name')->get();

        return Inertia::render('MaintenanceSchedules/Edit', [
            'schedule' => $maintenanceSchedule->load(['asset:id,name,code', 'checklistTemplate:id,name', 'defaultTechnician:id,name']),
            'assets' => $assets,
            'templates' => $templates,
            'technicians' => $technicians,
        ]);
    }

    public function update(Request $request, MaintenanceSchedule $maintenanceSchedule)
    {
        abort_unless($request->user()->can('manage maintenance schedules'), 403);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'asset_id' => 'sometimes|exists:assets,id',
            'checklist_template_id' => 'nullable|exists:checklist_templates,id',
            'frequency_type' => 'sometimes|in:daily,weekly,monthly,quarterly,bi-annual,annual,fixed_days,calendar,usage',
            'frequency_value' => 'sometimes|integer|min:1',
            'next_due_date' => 'sometimes|date',
            'default_technician_id' => 'nullable|exists:users,id',
            'occurrences' => 'integer|min:1|max:52',
        ]);

        $occurrences = (int) ($validated['occurrences'] ?? 1);
        unset($validated['occurrences']);
        $maintenanceSchedule->update($validated);

        if ($occurrences > 1) {
            $newDate = $validated['next_due_date'] ?? $maintenanceSchedule->next_due_date;
            $freqType = $validated['frequency_type'] ?? $maintenanceSchedule->frequency_type;
            $freqValue = $validated['frequency_value'] ?? $maintenanceSchedule->frequency_value;

            MaintenanceSchedule::where('asset_id', $maintenanceSchedule->asset_id)
                ->where('checklist_template_id', $maintenanceSchedule->checklist_template_id)
                ->where('frequency_type', $freqType)
                ->where('id', '!=', $maintenanceSchedule->id)
                ->where('next_due_date', '>', $maintenanceSchedule->next_due_date)
                ->delete();

            $dates = $this->calculateDates($freqType, $freqValue, $newDate, $occurrences);

            foreach ($dates as $i => $date) {
                if ($i === 0) {
                    continue;
                }
                MaintenanceSchedule::create([
                    'title' => $maintenanceSchedule->title,
                    'asset_id' => $maintenanceSchedule->asset_id,
                    'checklist_template_id' => $maintenanceSchedule->checklist_template_id,
                    'frequency_type' => $freqType,
                    'frequency_value' => $freqValue,
                    'next_due_date' => $date,
                    'default_technician_id' => $maintenanceSchedule->default_technician_id,
                    'is_active' => $maintenanceSchedule->is_active,
                ]);
            }
        }

        return redirect('/maintenance-schedules')->with('success', $occurrences > 1 ? "Schedule updated with {$occurrences} occurrence(s)." : 'Schedule updated.');
    }

    public function toggleActive(MaintenanceSchedule $maintenanceSchedule)
    {
        abort_unless(request()->user()->can('manage maintenance schedules'), 403);

        $maintenanceSchedule->update(['is_active' => ! $maintenanceSchedule->is_active]);

        return redirect('/maintenance-schedules')->with(
            'success',
            $maintenanceSchedule->is_active ? 'Schedule activated.' : 'Schedule inactivated.'
        );
    }

    public function assignTechnician(Request $request, MaintenanceSchedule $maintenanceSchedule)
    {
        abort_unless($request->user()->can('manage maintenance schedules'), 403);

        $validated = $request->validate([
            'technician_id' => 'nullable|exists:users,id',
        ]);

        $maintenanceSchedule->update(['default_technician_id' => $validated['technician_id']]);

        if ($validated['technician_id']) {
            $this->service->ensureWorkOrder($maintenanceSchedule->fresh());
        }

        return redirect('/maintenance-schedules')->with('success', 'Schedule assigned.');
    }

    private function calculateDates(string $frequencyType, int $frequencyValue, string $baseDate, int $occurrences): array
    {
        $base = Carbon::parse($baseDate);
        $dates = [];

        for ($i = 0; $i < $occurrences; $i++) {
            $dates[] = match ($frequencyType) {
                'daily' => $base->copy()->addDays($i),
                'weekly' => $base->copy()->addWeeks($i),
                'monthly' => $base->copy()->addMonths($i),
                'quarterly' => $base->copy()->addMonths($i * 3),
                'bi-annual' => $base->copy()->addMonths($i * 6),
                'annual' => $base->copy()->addYears($i),
                'fixed_days' => $base->copy()->addDays($i * $frequencyValue),
                'calendar', 'usage' => $base->copy(),
                default => $base->copy(),
            };
        }

        return $dates;
    }
}
