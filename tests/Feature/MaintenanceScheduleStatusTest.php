<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\MaintenanceSchedule;
use App\Models\User;
use App\Models\WorkOrder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaintenanceScheduleStatusTest extends TestCase
{
    use RefreshDatabase;

    private Asset $asset;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->asset = Asset::create(['name' => 'Test Asset', 'code' => 'AST-001', 'category' => 'HVAC']);
    }

    private function schedule(string $due, bool $active = true): MaintenanceSchedule
    {
        return MaintenanceSchedule::create([
            'title' => 'Daily Log Sheet Shift 1',
            'asset_id' => $this->asset->id,
            'frequency_type' => 'daily',
            'frequency_value' => 1,
            'next_due_date' => $due,
            'is_active' => $active,
        ]);
    }

    public function test_status_complete_when_linked_work_order_closed(): void
    {
        $schedule = $this->schedule(today()->subDay()->toDateString());

        $user = User::factory()->create();
        $wo = WorkOrder::create([
            'requester_id' => $user->id,
            'title' => '[PM] Test Asset - Daily Log Sheet Shift 1 - '.today()->subDay()->toDateString(),
            'asset_id' => $this->asset->id,
            'status' => 'closed',
        ]);

        $schedule->update(['work_order_id' => $wo->id]);

        $this->assertEquals('complete', $schedule->fresh()->status);
    }

    public function test_status_overdue_when_past_due_and_unlinked(): void
    {
        $schedule = $this->schedule(today()->subDay()->toDateString());

        $this->assertEquals('overdue', $schedule->fresh()->status);
    }

    public function test_status_scheduled_when_due_in_future(): void
    {
        $schedule = $this->schedule(today()->addDay()->toDateString());

        $this->assertEquals('scheduled', $schedule->fresh()->status);
    }

    public function test_status_inactive_when_deactivated(): void
    {
        $schedule = $this->schedule(today()->subDay()->toDateString(), false);

        $this->assertEquals('inactive', $schedule->fresh()->status);
    }

    public function test_status_complete_takes_precedence_over_overdue(): void
    {
        $schedule = $this->schedule(today()->subDays(3)->toDateString());

        $user = User::factory()->create();
        $wo = WorkOrder::create([
            'requester_id' => $user->id,
            'title' => '[PM] Test Asset - old',
            'asset_id' => $this->asset->id,
            'status' => 'closed',
        ]);

        $schedule->update(['work_order_id' => $wo->id]);

        $this->assertEquals('complete', $schedule->fresh()->status);
    }
}
