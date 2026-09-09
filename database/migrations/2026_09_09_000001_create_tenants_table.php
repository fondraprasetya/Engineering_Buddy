<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('plan')->default('trial');      // trial|starter|professional|enterprise
            $table->string('status')->default('trial');    // trial|active|suspended
            $table->json('settings')->nullable();
            $table->timestamps();
        });

        // Default tenant for the existing single-tenant data
        DB::table('tenants')->insert([
            'name' => 'Default',
            'slug' => 'default',
            'plan' => 'trial',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
