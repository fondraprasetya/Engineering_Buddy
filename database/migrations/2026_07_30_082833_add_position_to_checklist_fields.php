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
        Schema::table('checklist_fields', function (Blueprint $table) {
            $table->integer('x')->default(0);
            $table->integer('y')->default(0);
            $table->integer('width')->default(280);
        });
    }

    public function down(): void
    {
        Schema::table('checklist_fields', function (Blueprint $table) {
            $table->dropColumn(['x', 'y', 'width']);
        });
    }
};
