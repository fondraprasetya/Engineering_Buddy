<?php

namespace App\Services;

use App\Models\MaintenanceSchedule;
use App\Models\WorkOrder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MaintenanceScheduleService
{
    const int LEAD_DAYS = 3;

    public function computeNextDueDate(MaintenanceSchedule $schedule): ?string
    {
        $lastDue = $schedule->next_due_date;

        return match ($schedule->frequency_type) {
            'daily' => $lastDue->copy()->addDay()->toDateString(),
            'weekly' => $lastDue->copy()->addWeek()->toDateString(),
            'monthly' => $lastDue->copy()->addMonth()->toDateString(),
            'quarterly' => $lastDue->copy()->addMonths(3)->toDateString(),
            'bi-annual' => $lastDue->copy()->addMonths(6)->toDateString(),
            'annual' => $lastDue->copy()->addYear()->toDateString(),
            'fixed_days' => $lastDue->copy()->addDays((int) $schedule->frequency_value)->toDateString(),
            'calendar' => $this->computeCalendarNextDue($lastDue, $schedule),
            'usage' => null,
            default => null,
        };
    }

    private function computeCalendarNextDue(Carbon $lastDue, MaintenanceSchedule $schedule): string
    {
        $val = (int) $schedule->frequency_value;

        return match (true) {
            $val === 1 => $lastDue->copy()->addMonth()->toDateString(),
            $val === 3 => $lastDue->copy()->addMonths(3)->toDateString(),
            $val === 6 => $lastDue->copy()->addMonths(6)->toDateString(),
            $val === 12 => $lastDue->copy()->addYear()->toDateString(),
            default => $lastDue->copy()->addDays($val * 30)->toDateString(),
        };
    }

    public function processDueSchedules(): int
    {
        $processed = 0;

        $schedules = MaintenanceSchedule::active()
            ->where('next_due_date', '<=', now()->addDays(self::LEAD_DAYS))
            ->with(['defaultTechnician', 'asset'])
            ->get();

        foreach ($schedules as $schedule) {
            if ($this->createWorkOrder($schedule)) {
                $processed++;
            }
        }

        return $processed;
    }

    public function ensureWorkOrder(MaintenanceSchedule $schedule): ?WorkOrder
    {
        if (! $schedule->is_active || $schedule->next_due_date->gt(now()->addDays(self::LEAD_DAYS))) {
            return null;
        }

        $schedule->loadMissing(['defaultTechnician', 'asset']);

        return $this->createWorkOrder($schedule);
    }

    private function createWorkOrder(MaintenanceSchedule $schedule): ?WorkOrder
    {
        return DB::transaction(function () use ($schedule) {
            $date = $schedule->next_due_date->toDateString();
            $scheduleLabel = $schedule->title ? " - {$schedule->title}" : '';
            $title = "[PM] {$schedule->asset->name}{$scheduleLabel} - {$date}";

            $alreadyGenerated = WorkOrder::where('asset_id', $schedule->asset_id)
                ->where('title', 'like', "[PM] {$schedule->asset->name} %")
                ->where('title', 'like', "%{$date}")
                ->exists();

            if ($alreadyGenerated) {
                return null;
            }

            $workOrder = WorkOrder::create([
                'requester_id' => $schedule->default_technician_id ?? 1,
                'asset_id' => $schedule->asset_id,
                'checklist_template_id' => $schedule->checklist_template_id,
                'title' => $title,
                'description' => "Auto-generated preventive maintenance for {$schedule->asset->name} due {$date}.",
                'priority' => 'medium',
                'status' => 'approved',
            ]);

            if ($schedule->default_technician_id) {
                $workOrder->technicianAssignments()->create([
                    'technician_id' => $schedule->default_technician_id,
                    'scheduled_date' => $schedule->next_due_date->toDateString(),
                    'shift' => 'morning',
                    'status' => 'assigned',
                ]);
                $workOrder->update(['status' => 'assigned']);
            }

            app(NotificationService::class)->send(
                $schedule->defaultTechnician ?? $workOrder->requester,
                'maintenance_due',
                ['work_order_id' => $workOrder->id, 'title' => $title, 'asset_name' => $schedule->asset->name]
            );

            $schedule->update(['work_order_id' => $workOrder->id]);

            return $workOrder;
        });
    }

    public function rollOccurrences(): int
    {
        $created = 0;
        $today = Carbon::today();

        $rows = MaintenanceSchedule::active()->get();

        $series = $rows->groupBy(fn ($row) => implode('|', [
            $row->asset_id,
            $row->checklist_template_id,
            $row->title,
            $row->frequency_type,
            $row->frequency_value,
        ]));

        foreach ($series as $rows) {
            $latest = $rows->sortByDesc('next_due_date')->first();

            if (! $latest->is_active) {
                continue;
            }

            $nextDue = $this->computeNextDueDate($latest);

            if (! $nextDue || Carbon::parse($nextDue)->gt($today)) {
                continue;
            }

            DB::transaction(function () use ($latest, $today, &$created) {
                $occurrence = MaintenanceSchedule::create([
                    'title' => $latest->title,
                    'asset_id' => $latest->asset_id,
                    'checklist_template_id' => $latest->checklist_template_id,
                    'frequency_type' => $latest->frequency_type,
                    'frequency_value' => $latest->frequency_value,
                    'next_due_date' => $today->toDateString(),
                    'default_technician_id' => $latest->default_technician_id,
                    'is_active' => true,
                ]);

                MaintenanceSchedule::where('asset_id', $latest->asset_id)
                    ->where('checklist_template_id', $latest->checklist_template_id)
                    ->where('title', $latest->title)
                    ->where('frequency_type', $latest->frequency_type)
                    ->where('frequency_value', $latest->frequency_value)
                    ->where('id', '!=', $occurrence->id)
                    ->where('next_due_date', '<', $today->toDateString())
                    ->update(['is_active' => false]);

                $created++;
            });
        }

        return $created;
    }

    public function getOverdueCount(): int
    {
        return MaintenanceSchedule::active()
            ->where('next_due_date', '<', now())
            ->count();
    }
}
