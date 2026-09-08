<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('actual_expenses', function (Blueprint $table) {
            $table->string('document_ref', 100)->nullable()->after('description');
            $table->string('status', 20)->default('actual')->after('document_ref');
            $table->foreignId('work_order_id')->nullable()->constrained('work_orders')->nullOnDelete()->after('status');
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete()->after('work_order_id');
            $table->foreignId('maintenance_schedule_id')->nullable()->constrained('maintenance_schedules')->nullOnDelete()->after('project_id');
        });
    }

    public function down(): void
    {
        Schema::table('actual_expenses', function (Blueprint $table) {
            $table->dropForeign(['work_order_id']);
            $table->dropForeign(['project_id']);
            $table->dropForeign(['maintenance_schedule_id']);
            $table->dropColumn(['document_ref', 'status', 'work_order_id', 'project_id', 'maintenance_schedule_id']);
        });
    }
};
