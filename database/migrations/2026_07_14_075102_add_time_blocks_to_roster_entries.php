<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roster_entries', function (Blueprint $table) {
            $table->json('time_blocks')->nullable()->after('shift');
        });

        DB::table('roster_entries')->whereNotNull('clock_in')->eachById(function ($entry) {
            $blocks = [];
            if ($entry->clock_in) {
                $blocks[] = ['in' => $entry->clock_in, 'out' => $entry->clock_out];
            }
            DB::table('roster_entries')->where('id', $entry->id)->update(['time_blocks' => json_encode($blocks)]);
        });

        Schema::table('roster_entries', function (Blueprint $table) {
            $table->dropColumn(['clock_in', 'clock_out']);
        });
    }

    public function down(): void
    {
        Schema::table('roster_entries', function (Blueprint $table) {
            $table->time('clock_in')->nullable()->after('shift');
            $table->time('clock_out')->nullable()->after('clock_in');
            $table->dropColumn('time_blocks');
        });
    }
};
