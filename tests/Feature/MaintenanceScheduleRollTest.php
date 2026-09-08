<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\MaintenanceSchedule;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class MaintenanceScheduleRollTest extends TestCase
{
    use RefreshDatabase;

    private Asset $asset;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->asset = Asset::create(['name' => 'Test Asset', 'code' => 'AST-001', 'category' => 'HVAC']);
    }

    public function test_daily_occurrence_created_when_next_due_has_arrived(): void
    {
        MaintenanceSchedule::create([
            'title' => 'Daily Log Sheet Shift 1',
            'asset_id' => $this->asset->id,
            'frequency_type' => 'daily',
            'frequency_value' => 1,
            'next_due_date' => today()->subDay()->toDateString(),
            'is_active' => true,
        ]);

        Artisan::call('maintenance:roll');

        $this->assertSame(2, MaintenanceSchedule::count());
        $this->assertSame(1, MaintenanceSchedule::active()->count());
        $this->assertTrue(MaintenanceSchedule::where('title', 'Daily Log Sheet Shift 1')
            ->whereDate('next_due_date', today())
            ->where('is_active', true)
            ->exists());
        $this->assertFalse(MaintenanceSchedule::where('title', 'Daily Log Sheet Shift 1')
            ->whereDate('next_due_date', today()->subDay())
            ->first()->is_active);
    }

    public function test_weekly_occurrence_not_created_daily(): void
    {
        MaintenanceSchedule::create([
            'title' => 'Weekly Inspection',
            'asset_id' => $this->asset->id,
            'frequency_type' => 'weekly',
            'frequency_value' => 1,
            'next_due_date' => today()->subDay()->toDateString(),
            'is_active' => true,
        ]);

        Artisan::call('maintenance:roll');

        $this->assertSame(1, MaintenanceSchedule::count());
    }

    public function test_weekly_occurrence_created_when_cadence_arrives(): void
    {
        MaintenanceSchedule::create([
            'title' => 'Weekly Inspection',
            'asset_id' => $this->asset->id,
            'frequency_type' => 'weekly',
            'frequency_value' => 1,
            'next_due_date' => today()->subDays(7)->toDateString(),
            'is_active' => true,
        ]);

        Artisan::call('maintenance:roll');

        $this->assertSame(2, MaintenanceSchedule::count());
        $this->assertTrue(MaintenanceSchedule::where('title', 'Weekly Inspection')
            ->whereDate('next_due_date', today())
            ->where('is_active', true)
            ->exists());
    }

    public function test_inactive_series_not_extended(): void
    {
        MaintenanceSchedule::create([
            'title' => 'Paused Schedule',
            'asset_id' => $this->asset->id,
            'frequency_type' => 'daily',
            'frequency_value' => 1,
            'next_due_date' => today()->subDay()->toDateString(),
            'is_active' => false,
        ]);

        Artisan::call('maintenance:roll');

        $this->assertSame(1, MaintenanceSchedule::count());
    }

    public function test_future_dated_series_not_extended(): void
    {
        MaintenanceSchedule::create([
            'title' => 'Future Schedule',
            'asset_id' => $this->asset->id,
            'frequency_type' => 'daily',
            'frequency_value' => 1,
            'next_due_date' => today()->addDay()->toDateString(),
            'is_active' => true,
        ]);

        Artisan::call('maintenance:roll');

        $this->assertSame(1, MaintenanceSchedule::count());
    }
}
