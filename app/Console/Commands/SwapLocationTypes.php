<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SwapLocationTypes extends Command
{
    protected $signature = 'locations:swap-types';

    protected $description = 'Swap type values between floor and area to restructure hierarchy to Building > Area > Floor > Room';

    public function handle()
    {
        $this->info('Swapping location types: floor ↔ area...');

        $floors = DB::table('locations')->where('type', 'floor')->count();
        $areas = DB::table('locations')->where('type', 'area')->count();

        if ($floors === 0 && $areas === 0) {
            $this->warn('No floor or area records found. Nothing to swap.');

            return Command::SUCCESS;
        }

        DB::transaction(function () {
            DB::table('locations')->where('type', 'floor')->update(['type' => '_swap_']);
            DB::table('locations')->where('type', 'area')->update(['type' => 'floor']);
            DB::table('locations')->where('type', '_swap_')->update(['type' => 'area']);
        });

        $this->info(sprintf('Swapped %d floor → area and %d area → floor records.', $floors, $areas));
        $this->info('Hierarchy is now: Building → Area → Floor → Room');

        return Command::SUCCESS;
    }
}
