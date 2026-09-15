<?php

namespace Tests\Feature;

use App\Models\CalendarEvent;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $a;

    private Tenant $b;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Tenant::create(['name' => 'Hotel A', 'slug' => 'hotel-a']);
        $this->b = Tenant::create(['name' => 'Hotel B', 'slug' => 'hotel-b']);
    }

    private function makeUser(Tenant $t, string $email): User
    {
        TenantContext::set($t->id);

        try {
            return User::create([
                'name' => 'User '.$email,
                'email' => $email,
                'password' => 'password123',
            ]);
        } finally {
            TenantContext::clear();
        }
    }

    public function test_create_auto_fills_tenant_from_context(): void
    {
        $user = $this->makeUser($this->a, 'a@t.test');

        TenantContext::set($this->a->id);

        try {
            $event = CalendarEvent::create([
                'user_id' => $user->id,
                'title' => 'Daily Statistics',
                'start_datetime' => '2026-09-01 00:00:00',
                'end_datetime' => '2026-09-01 23:59:00',
            ]);
        } finally {
            TenantContext::clear();
        }

        $this->assertSame($this->a->id, $event->tenant_id);
    }

    public function test_tenant_cannot_see_other_tenant_rows(): void
    {
        $ua = $this->makeUser($this->a, 'a@t.test');
        $ub = $this->makeUser($this->b, 'b@t.test');

        TenantContext::set($this->a->id);
        CalendarEvent::create(['user_id' => $ua->id, 'title' => 'A event', 'start_datetime' => '2026-09-01 00:00:00', 'end_datetime' => '2026-09-01 01:00:00']);
        TenantContext::set($this->b->id);
        CalendarEvent::create(['user_id' => $ub->id, 'title' => 'B event', 'start_datetime' => '2026-09-01 00:00:00', 'end_datetime' => '2026-09-01 01:00:00']);
        TenantContext::clear();

        TenantContext::set($this->a->id);
        $this->assertSame(['A event'], CalendarEvent::pluck('title')->all());
        TenantContext::set($this->b->id);
        $this->assertSame(['B event'], CalendarEvent::pluck('title')->all());
        TenantContext::clear();
    }

    public function test_null_context_skips_scope_for_internal_lookups(): void
    {
        TenantContext::set($this->a->id);
        CalendarEvent::create(['user_id' => $this->makeUser($this->a, 'a@t.test')->id, 'title' => 'A event', 'start_datetime' => '2026-09-01 00:00:00', 'end_datetime' => '2026-09-01 01:00:00']);
        TenantContext::clear();

        // No context (CLI-style): unscoped, row still reachable by explicit query
        $this->assertSame(1, CalendarEvent::withoutGlobalScopes()->count());
    }
}
