<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RemoveFloorFromHierarchy extends Command
{
    protected $signature = 'locations:remove-floor';

    protected $description = 'Re-parent rooms from Floor to Area and delete Floor records, making hierarchy Building > Area > Room';

    public function handle()
    {
        $floors = DB::table('locations')->where('type', 'floor')->get();

        if ($floors->isEmpty()) {
            $this->warn('No floor records found. Nothing to do.');

            return Command::SUCCESS;
        }

        DB::transaction(function () use ($floors) {
            foreach ($floors as $floor) {
                DB::table('locations')
                    ->where('type', 'room')
                    ->where('parent_id', $floor->id)
                    ->update(['parent_id' => $floor->parent_id]);
            }

            DB::table('locations')->where('type', 'floor')->delete();
        });

        $this->info(sprintf('Re-parented rooms from %d floor records and deleted them.', $floors->count()));
        $this->info('Hierarchy is now: Building → Area → Room');

        return Command::SUCCESS;
    }
}
