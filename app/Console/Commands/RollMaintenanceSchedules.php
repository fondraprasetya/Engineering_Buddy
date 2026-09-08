<?php

namespace App\Console\Commands;

use App\Services\MaintenanceScheduleService;
use Illuminate\Console\Command;

class RollMaintenanceSchedules extends Command
{
    protected $signature = 'maintenance:roll';

    protected $description = 'Create today\'s occurrence for recurring maintenance schedules whose next due date has arrived';

    public function handle(MaintenanceScheduleService $service): int
    {
        $count = $service->rollOccurrences();

        $this->info("Created {$count} maintenance schedule occurrence(s).");

        return Command::SUCCESS;
    }
}
