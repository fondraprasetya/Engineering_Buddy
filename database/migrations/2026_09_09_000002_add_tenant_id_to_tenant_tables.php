<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Tenant-owned tables (excludes framework/system and spatie permission tables)
    private array $tables = [
        'users',
        'departments',
        'work_orders',
        'work_order_photos',
        'work_order_approvals',
        'technician_assignments',
        'assets',
        'locations',
        'calendar_events',
        'maintenance_schedules',
        'checklist_templates',
        'checklist_fields',
        'checklist_responses',
        'projects',
        'project_milestones',
        'monthly_budgets',
        'actual_expenses',
        'post_accounts',
        'store_categories',
        'store_items',
        'store_receivings',
        'store_requests',
        'store_stock_adjustments',
        'utility_rates',
        'daily_utilities',
        'daily_logs',
        'roster_entries',
        'telegram_links',
        'notifications',
        'dashboard_settings',
        'import_logs',
    ];

    public function up(): void
    {
        $defaultTenantId = DB::table('tenants')->where('slug', 'default')->value('id');

        foreach ($this->tables as $table) {
            if (! Schema::hasColumn($table, 'tenant_id')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->unsignedBigInteger('tenant_id')->nullable()->index();
                });
            }
            if ($defaultTenantId) {
                DB::table($table)->update(['tenant_id' => $defaultTenantId]);
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasColumn($table, 'tenant_id')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropColumn('tenant_id');
                });
            }
        }
    }
};
