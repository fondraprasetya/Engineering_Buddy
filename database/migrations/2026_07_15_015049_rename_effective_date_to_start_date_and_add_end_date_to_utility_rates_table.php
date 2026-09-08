<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('utility_rates', function (Blueprint $table) {
            $table->renameColumn('effective_date', 'start_date');
            $table->date('end_date')->nullable()->after('start_date');
        });
    }

    public function down(): void
    {
        Schema::table('utility_rates', function (Blueprint $table) {
            $table->dropColumn('end_date');
            $table->renameColumn('start_date', 'effective_date');
        });
    }
};
