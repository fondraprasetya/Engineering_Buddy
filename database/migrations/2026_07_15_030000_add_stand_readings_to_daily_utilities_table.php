<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_utilities', function (Blueprint $table) {
            $table->decimal('beginning_stand', 12, 2)->nullable()->after('unit');
            $table->decimal('ending_stand', 12, 2)->nullable()->after('beginning_stand');
        });
    }

    public function down(): void
    {
        Schema::table('daily_utilities', function (Blueprint $table) {
            $table->dropColumn(['beginning_stand', 'ending_stand']);
        });
    }
};
