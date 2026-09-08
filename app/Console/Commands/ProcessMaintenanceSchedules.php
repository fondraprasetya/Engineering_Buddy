<?php

namespace App\Console\Commands;

use App\Services\MaintenanceScheduleService;
use Illuminate\Console\Command;

class ProcessMaintenanceSchedules extends Command
{
    protected $signature = 'maintenance:process';

    protected $description = 'Check maintenance schedules and generate work orders for due/upcoming items';

    public function handle(MaintenanceScheduleService $service): int
    {
        $count = $service->processDueSchedules();

        $this->info("Processed {$count} maintenance schedule(s).");

        return Command::SUCCESS;
    }
}
