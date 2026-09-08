<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Department;
use App\Models\User;
use App\Models\WorkOrder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssetHistoryTest extends TestCase
{
    use RefreshDatabase;

    private Department $dept;

    private User $engAdmin;

    private Asset $asset;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->dept = Department::create(['name' => 'Test']);

        $this->engAdmin = User::factory()->create();
        $this->engAdmin->assignRole('eng-admin');

        $this->asset = Asset::create([
            'name' => 'History Test Asset', 'code' => 'HST-001', 'category' => 'HVAC',
        ]);
    }

    public function test_asset_history_returns_work_orders(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->engAdmin->id,
            'asset_id' => $this->asset->id,
            'title' => 'History WO',
            'status' => 'completed',
        ]);

        $response = $this->actingAs($this->engAdmin)->getJson("/api/v1/assets/{$this->asset->id}/history");

        $response->assertOk();
        $this->assertCount(1, $response->json('work_orders'));
        $this->assertEquals('History WO', $response->json('work_orders')[0]['title']);
    }

    public function test_asset_history_includes_maintenance_schedules(): void
    {
        $this->asset->maintenanceSchedules()->create([
            'frequency_type' => 'fixed_days',
            'frequency_value' => 30,
            'next_due_date' => now()->addDays(15)->toDateString(),
        ]);

        $response = $this->actingAs($this->engAdmin)->getJson("/api/v1/assets/{$this->asset->id}/history");

        $response->assertOk();
        $this->assertCount(1, $response->json('maintenance_schedules'));
    }

    public function test_asset_history_filters_by_date_range(): void
    {
        $old = new WorkOrder;
        $old->forceFill([
            'requester_id' => $this->engAdmin->id,
            'asset_id' => $this->asset->id,
            'title' => 'Old WO',
            'status' => 'closed',
            'created_at' => now()->subMonths(2),
        ])->save();

        $recent = new WorkOrder;
        $recent->forceFill([
            'requester_id' => $this->engAdmin->id,
            'asset_id' => $this->asset->id,
            'title' => 'Recent WO',
            'status' => 'completed',
            'created_at' => now()->subDays(5),
        ])->save();

        $response = $this->actingAs($this->engAdmin)->getJson(
            "/api/v1/assets/{$this->asset->id}/history?date_from=".now()->subDays(10)->toDateString()
        );

        $response->assertOk();
        $this->assertCount(1, $response->json('work_orders'));
        $this->assertEquals('Recent WO', $response->json('work_orders')[0]['title']);
    }

    public function test_gm_can_view_asset_history(): void
    {
        $gm = User::factory()->create();
        $gm->assignRole('gm');

        $response = $this->actingAs($gm)->getJson("/api/v1/assets/{$this->asset->id}/history");

        $response->assertOk();
    }
}
