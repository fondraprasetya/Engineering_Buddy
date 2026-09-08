<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('monthly_budgets', function (Blueprint $table) {
            $table->unique(['year', 'month', 'post_account']);
        });
    }

    public function down(): void
    {
        Schema::table('monthly_budgets', function (Blueprint $table) {
            $table->dropUnique('monthly_budgets_year_month_post_account_unique');
        });
    }
};
