<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        config(['services.midtrans.server_key' => 'test-server-key']);
    }

    private function tenant(): Tenant
    {
        return Tenant::create(['name' => 'Hotel T', 'slug' => 'hotel-t']);
    }

    public function test_expire_trials_flips_only_expired(): void
    {
        $t = $this->tenant();
        Subscription::create(['tenant_id' => $t->id, 'plan' => 'starter', 'status' => 'trial', 'trial_ends_at' => now()->subDay()]);
        Subscription::create(['tenant_id' => $t->id, 'plan' => 'starter', 'status' => 'trial', 'trial_ends_at' => now()->addDays(7)]);

        $this->artisan('billing:expire-trials')->assertSuccessful();

        $statuses = Subscription::where('tenant_id', $t->id)->orderBy('id')->pluck('status')->all();
        $this->assertSame(['past_due', 'trial'], $statuses);
    }

    public function test_unsigned_webhook_rejected_outside_local(): void
    {
        // APP_ENV=testing is not local, so the mock fallback must 404
        $this->postJson('/api/v1/billing/webhook', [
            'type' => 'payment.success',
            'data' => ['tenant_id' => 99999],
        ])->assertNotFound();

        $this->assertSame(0, Subscription::where('tenant_id', 99999)->count());
    }

    public function test_forged_midtrans_signature_rejected(): void
    {
        $this->postJson('/api/v1/billing/webhook', [
            'signature_key' => 'forged',
            'order_id' => 'SUB-1-professional-x',
            'status_code' => '200',
            'gross_amount' => '850000.00',
            'transaction_status' => 'settlement',
        ])->assertUnauthorized();
    }

    public function test_valid_settlement_activates_subscription(): void
    {
        $t = $this->tenant();
        $order = "SUB-{$t->id}-professional-abc123";

        $payload = [
            'order_id' => $order,
            'status_code' => '200',
            'gross_amount' => '850000.00',
            'transaction_status' => 'settlement',
        ];
        $payload['signature_key'] = hash('sha512', $order.'200'.'850000.00'.'test-server-key');

        $this->postJson('/api/v1/billing/webhook', $payload)->assertOk();

        $sub = Subscription::where('tenant_id', $t->id)->first();
        $this->assertNotNull($sub);
        $this->assertSame('active', $sub->status);
        $this->assertSame('midtrans', $sub->provider);
    }

    public function test_past_due_tenant_blocked_from_dashboard(): void
    {
        $t = $this->tenant();
        Subscription::create(['tenant_id' => $t->id, 'plan' => 'starter', 'status' => 'past_due']);

        \App\Tenancy\TenantContext::set($t->id);
        $user = User::create(['name' => 'Owner', 'email' => 'o@t.test', 'password' => 'password123']);
        \App\Tenancy\TenantContext::clear();

        $this->actingAs($user)->get('/dashboard')->assertRedirect('/billing');
    }
}
