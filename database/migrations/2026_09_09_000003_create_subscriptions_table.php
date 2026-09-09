<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->string('plan')->default('trial');   // trial|starter|professional|enterprise
            $table->string('status')->default('trial'); // trial|active|past_due|canceled|expired
            $table->string('provider')->nullable();     // stripe|midtrans|xendit|mock
            $table->string('provider_customer_id')->nullable();
            $table->string('provider_subscription_id')->nullable();
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_start')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('currency', 3)->default('IDR');
            $table->timestamps();
        });

        // Backfill an active enterprise subscription for existing tenants so the app keeps working
        $defaultTenant = DB::table('tenants')->value('id');
        if ($defaultTenant && ! DB::table('subscriptions')->where('tenant_id', $defaultTenant)->exists()) {
            DB::table('subscriptions')->insert([
                'tenant_id' => $defaultTenant,
                'plan' => 'enterprise',
                'status' => 'active',
                'provider' => 'mock',
                'amount' => 0,
                'currency' => 'IDR',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
