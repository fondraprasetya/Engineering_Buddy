<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('maintenance_schedules', function (Blueprint $table) {
            $table->foreignId('work_order_id')->nullable()->after('is_active')->constrained('work_orders')->nullOnDelete();
        });

        $schedules = DB::table('maintenance_schedules')->get();

        foreach ($schedules as $schedule) {
            $date = substr((string) $schedule->next_due_date, 0, 10);

            $workOrder = DB::table('work_orders')
                ->where('asset_id', $schedule->asset_id)
                ->where('checklist_template_id', $schedule->checklist_template_id)
                ->where('title', 'like', "%{$date}")
                ->orderByDesc('id')
                ->first();

            if ($workOrder) {
                DB::table('maintenance_schedules')
                    ->where('id', $schedule->id)
                    ->update(['work_order_id' => $workOrder->id]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('maintenance_schedules', function (Blueprint $table) {
            $table->dropConstrainedForeignId('work_order_id');
        });
    }
};
