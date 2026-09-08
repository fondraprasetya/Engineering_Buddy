<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roster_entries', function (Blueprint $table) {
            $table->time('clock_in')->nullable()->after('shift');
            $table->time('clock_out')->nullable()->after('clock_in');
        });
    }

    public function down(): void
    {
        Schema::table('roster_entries', function (Blueprint $table) {
            $table->dropColumn(['clock_in', 'clock_out']);
        });
    }
};
