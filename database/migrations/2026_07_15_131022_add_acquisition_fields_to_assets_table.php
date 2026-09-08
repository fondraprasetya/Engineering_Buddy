<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->decimal('acquisition_cost', 15, 2)->nullable()->after('photo');
            $table->date('acquisition_date')->nullable()->after('acquisition_cost');
        });
    }

    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropColumn(['acquisition_cost', 'acquisition_date']);
        });
    }
};
