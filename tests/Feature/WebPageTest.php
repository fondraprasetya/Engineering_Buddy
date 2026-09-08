<?php

namespace Tests\Feature;

use App\Models\ActualExpense;
use App\Models\Asset;
use App\Models\CalendarEvent;
use App\Models\ChecklistField;
use App\Models\ChecklistResponse;
use App\Models\ChecklistTemplate;
use App\Models\DailyLog;
use App\Models\DailyUtility;
use App\Models\Department;
use App\Models\Location;
use App\Models\MaintenanceSchedule;
use App\Models\MonthlyBudget;
use App\Models\Notification;
use App\Models\PostAccount;
use App\Models\Project;
use App\Models\RosterEntry;
use App\Models\StoreCategory;
use App\Models\StoreItem;
use App\Models\StoreRequest;
use App\Models\StoreStockAdjustment;
use App\Models\User;
use App\Models\UtilityRate;
use App\Models\WorkOrder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WebPageTest extends TestCase
{
    use RefreshDatabase;

    private Department $dept;

    private User $admin;

    private User $employee;

    private User $technician;

    private Asset $asset;

    private Location $building;

    private Location $area;

    private Location $room;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->dept = Department::create(['name' => 'Engineering']);

        $this->admin = User::factory()->create(['department_id' => $this->dept->id]);
        $this->admin->assignRole('eng-admin');

        $this->employee = User::factory()->create(['department_id' => $this->dept->id]);
        $this->employee->assignRole('employee');

        $this->technician = User::factory()->create(['department_id' => $this->dept->id]);
        $this->technician->assignRole('technician');

        $this->asset = Asset::create(['name' => 'Test Asset', 'code' => 'AST-001', 'category' => 'HVAC']);

        $this->building = Location::create(['name' => 'Main Bldg', 'type' => 'building', 'code' => 'BLD-001']);
        $this->area = Location::create(['name' => 'Lobby', 'type' => 'area', 'code' => 'AR-001', 'parent_id' => $this->building->id]);
        $this->room = Location::create(['name' => 'Room 101', 'type' => 'room', 'code' => 'RM-001', 'parent_id' => $this->area->id, 'floor_number' => '1']);
    }

    public function test_login_page_loads(): void
    {
        $response = $this->get('/login');
        $response->assertOk();
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $response = $this->get('/dashboard');
        $response->assertRedirect('/login');
    }

    public function test_dashboard_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/dashboard');
        $response->assertOk();
    }

    public function test_root_redirects_to_dashboard(): void
    {
        $response = $this->actingAs($this->admin)->get('/');
        $response->assertRedirect('/dashboard');
    }

    public function test_logout_redirects_to_login(): void
    {
        $response = $this->actingAs($this->admin)->post('/logout');
        $response->assertRedirect('/login');
    }

    // â”€â”€â”€ Work Orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_work_orders_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/work-orders');
        $response->assertOk();
    }

    public function test_work_orders_create_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/work-orders/create');
        $response->assertOk();
    }

    public function test_work_orders_show_loads(): void
    {
        $wo = WorkOrder::create(['requester_id' => $this->employee->id, 'title' => 'Test WO', 'status' => 'pending_dept_head']);

        $response = $this->actingAs($this->admin)->get("/work-orders/{$wo->id}");
        $response->assertOk();
    }

    public function test_work_order_store_creates_record(): void
    {
        $response = $this->actingAs($this->employee)->post('/work-orders', [
            'title' => 'New WO',
            'priority' => 'medium',
            'description' => 'Test description',
            'asset_id' => $this->asset->id,
            'location_id' => $this->room->id,
        ]);

        $response->assertRedirect('/work-orders');
        $this->assertDatabaseHas('work_orders', ['title' => 'New WO']);
    }

    // â”€â”€â”€ Assets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_assets_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/assets');
        $response->assertOk();
    }

    public function test_assets_create_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/assets/create');
        $response->assertOk();
    }

    public function test_assets_show_loads(): void
    {
        $response = $this->actingAs($this->admin)->get("/assets/{$this->asset->id}");
        $response->assertOk();
    }

    public function test_assets_edit_loads(): void
    {
        $response = $this->actingAs($this->admin)->get("/assets/{$this->asset->id}/edit");
        $response->assertOk();
    }

    public function test_assets_store_creates_record(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->admin)->post('/assets', [
            'name' => 'New Asset',
            'category' => 'Equipment',
            'location_id' => $this->room->id,
            'acquisition_cost' => 5000000,
            'acquisition_date' => now()->toDateString(),
            'photo' => UploadedFile::fake()->create('asset.jpg', 1),
        ]);

        $response->assertRedirect('/assets');
        $this->assertDatabaseHas('assets', ['name' => 'New Asset', 'category' => 'Equipment']);
    }

    public function test_assets_update_modifies_record(): void
    {
        $response = $this->actingAs($this->admin)->post("/assets/{$this->asset->id}", [
            'name' => 'Updated Asset',
            'category' => 'Mechanical',
        ]);

        $response->assertRedirect('/assets');
        $this->assertDatabaseHas('assets', ['name' => 'Updated Asset']);
    }

    public function test_assets_history_loads(): void
    {
        $response = $this->actingAs($this->admin)->get("/assets/{$this->asset->id}/history");
        $response->assertOk();
    }

    public function test_assets_qrcode_loads(): void
    {
        $response = $this->actingAs($this->admin)->get("/assets/{$this->asset->id}/qrcode");
        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/svg+xml');
    }

    // â”€â”€â”€ Locations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_locations_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/locations');
        $response->assertOk();
    }

    public function test_locations_create_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/locations/create');
        $response->assertOk();
    }

    public function test_locations_edit_loads(): void
    {
        $response = $this->actingAs($this->admin)->get("/locations/{$this->building->id}/edit");
        $response->assertOk();
    }

    public function test_locations_store_creates_record(): void
    {
        $response = $this->actingAs($this->admin)->post('/locations', [
            'name' => 'New Building',
            'type' => 'building',
        ]);

        $response->assertRedirect('/locations');
        $this->assertDatabaseHas('locations', ['name' => 'New Building', 'type' => 'building']);
    }

    public function test_locations_update_modifies_record(): void
    {
        $response = $this->actingAs($this->admin)->post("/locations/{$this->building->id}", [
            'name' => 'Renamed Building',
        ]);

        $response->assertRedirect('/locations');
        $this->assertDatabaseHas('locations', ['name' => 'Renamed Building']);
    }

    public function test_locations_store_room_requires_floor_number(): void
    {
        $response = $this->actingAs($this->admin)->post('/locations', [
            'name' => 'New Room',
            'type' => 'room',
            'parent_id' => $this->area->id,
        ]);

        $response->assertSessionHasErrors('floor_number');
    }

    // â”€â”€â”€ Calendar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_calendar_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/calendar');
        $response->assertOk();
    }

    public function test_calendar_events_json(): void
    {
        CalendarEvent::create([
            'user_id' => $this->admin->id,
            'title' => 'Test Event',
            'start_datetime' => now(),
            'end_datetime' => now()->addHour(),
        ]);

        $response = $this->actingAs($this->admin)->getJson('/calendar/events?start='.now()->subDay()->format('Y-m-d\TH:i:s').'&end='.now()->addDay()->format('Y-m-d\TH:i:s'));
        $response->assertOk();
        $response->assertJsonCount(1);
    }

    public function test_calendar_event_store_via_web(): void
    {
        $response = $this->actingAs($this->admin)->post('/calendar/events', [
            'title' => 'Web Created Event',
            'start_datetime' => now()->format('Y-m-d\TH:i:s'),
            'end_datetime' => now()->addHour()->format('Y-m-d\TH:i:s'),
            'all_day' => false,
            'type' => 'half_day',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('calendar_events', ['title' => 'Web Created Event']);
    }

    public function test_calendar_event_update(): void
    {
        $event = CalendarEvent::create([
            'user_id' => $this->admin->id,
            'title' => 'Original',
            'start_datetime' => now(),
            'end_datetime' => now()->addHour(),
        ]);

        $response = $this->actingAs($this->admin)->put("/calendar/events/{$event->id}", [
            'title' => 'Updated Event',
            'start_datetime' => now()->format('Y-m-d\TH:i:s'),
            'end_datetime' => now()->addHour()->format('Y-m-d\TH:i:s'),
            'all_day' => false,
        ]);

        $response->assertOk();
        $this->assertEquals('Updated Event', $event->fresh()->title);
    }

    public function test_calendar_event_delete(): void
    {
        $event = CalendarEvent::create([
            'user_id' => $this->admin->id,
            'title' => 'Delete Me',
            'start_datetime' => now(),
            'end_datetime' => now()->addHour(),
        ]);

        $response = $this->actingAs($this->admin)->delete("/calendar/events/{$event->id}");
        $response->assertNoContent();
        $this->assertDatabaseMissing('calendar_events', ['id' => $event->id]);
    }

    // â”€â”€â”€ Daily Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_daily_logs_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/daily-logs');
        $response->assertOk();
    }

    public function test_daily_logs_create_loads(): void
    {
        $response = $this->actingAs($this->technician)->get('/daily-logs/create');
        $response->assertOk();
    }

    public function test_daily_logs_store_creates_record(): void
    {
        $response = $this->actingAs($this->technician)->post('/daily-logs', [
            'log_date' => now()->toDateString(),
            'activities' => 'Performed maintenance',
            'hours_worked' => 8,
        ]);

        $response->assertRedirect('/daily-logs');
        $this->assertDatabaseHas('daily_logs', ['activities' => 'Performed maintenance']);
    }

    // â”€â”€â”€ Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_utilities_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/utilities');
        $response->assertOk();
    }

    public function test_utilities_create_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/utilities/create');
        $response->assertOk();
    }

    public function test_utilities_edit_loads(): void
    {
        $utility = DailyUtility::create([
            'record_date' => now(),
            'type' => 'electricity',
            'beginning_stand' => 100,
            'ending_stand' => 200,
            'consumption' => 100,
            'unit' => 'kWh',
            'recorded_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->get("/utilities/{$utility->id}/edit");
        $response->assertOk();
    }

    public function test_utilities_store_creates_record(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->admin)->post('/utilities', [
            'record_date' => now()->toDateString(),
            'type' => 'electricity',
            'beginning_stand' => 100,
            'ending_stand' => 150,
            'unit' => 'kWh',
            'cost' => 75000,
            'photo' => UploadedFile::fake()->create('meter.jpg', 1),
        ]);

        $response->assertRedirect('/utilities');
        $this->assertDatabaseHas('daily_utilities', ['type' => 'electricity', 'consumption' => 50]);
    }

    public function test_utilities_update_modifies_record(): void
    {
        $utility = DailyUtility::create([
            'record_date' => now(),
            'type' => 'water',
            'beginning_stand' => 200,
            'ending_stand' => 250,
            'consumption' => 50,
            'unit' => 'mÂ³',
            'recorded_by' => $this->admin->id,
        ]);

        Storage::fake('public');

        $response = $this->actingAs($this->admin)->put("/utilities/{$utility->id}", [
            'record_date' => now()->toDateString(),
            'type' => 'water',
            'beginning_stand' => 200,
            'ending_stand' => 300,
            'unit' => 'mÂ³',
            'cost' => 500000,
        ]);

        $response->assertRedirect('/utilities');
        $this->assertEquals(100, $utility->fresh()->consumption);
    }

    public function test_utilities_export_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/utilities/export');
        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }

    public function test_utilities_previous_stand_returns_stand(): void
    {
        DailyUtility::create([
            'record_date' => now()->subDay(),
            'type' => 'electricity',
            'beginning_stand' => 0,
            'ending_stand' => 500,
            'consumption' => 500,
            'unit' => 'kWh',
            'recorded_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/utilities/previous-stand?type=electricity&date='.now()->toDateString());
        $response->assertOk();
        $this->assertEquals(500, $response->json('ending_stand'));
    }

    // â”€â”€â”€ Utility Rates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_utility_rates_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/utility-rates');
        $response->assertOk();
    }

    public function test_utility_rates_create_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/utility-rates/create');
        $response->assertOk();
    }

    public function test_utility_rates_edit_loads(): void
    {
        $rate = UtilityRate::create(['type' => 'electricity', 'cost_per_unit' => 1500, 'unit' => 'kWh']);

        $response = $this->actingAs($this->admin)->get("/utility-rates/{$rate->id}/edit");
        $response->assertOk();
    }

    public function test_utility_rates_store_creates_record(): void
    {
        $response = $this->actingAs($this->admin)->post('/utility-rates', [
            'type' => 'gas',
            'cost_per_unit' => 5000,
            'unit' => 'mÂ³',
        ]);

        $response->assertRedirect('/utility-rates');
        $this->assertDatabaseHas('utility_rates', ['type' => 'gas', 'cost_per_unit' => 5000]);
    }

    // â”€â”€â”€ Projects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_projects_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/projects');
        $response->assertOk();
    }

    public function test_projects_create_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/projects/create');
        $response->assertOk();
    }

    public function test_projects_show_loads(): void
    {
        $project = Project::create([
            'name' => 'Test Project',
            'checkpoints' => [['title' => 'Phase 1', 'due_date' => now()->addMonth()->toDateString()]],
            'budget_items' => [['description' => 'Materials', 'qty' => 1, 'amount' => 1000000]],
            'start_date' => now(),
            'end_date' => now()->addMonth(),
            'budget_planned' => 1000000,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->get("/projects/{$project->id}");
        $response->assertOk();
    }

    public function test_projects_store_creates_record(): void
    {
        $response = $this->actingAs($this->admin)->post('/projects', [
            'name' => 'New Project',
            'description' => 'A test project',
            'checkpoints' => [
                ['title' => 'Start', 'due_date' => now()->addDay()->toDateString()],
                ['title' => 'End', 'due_date' => now()->addMonth()->toDateString()],
            ],
            'budget_items' => [
                ['description' => 'Labor', 'qty' => 2, 'amount' => 500000],
            ],
            'asset_id' => $this->asset->id,
        ]);

        $response->assertRedirect('/projects');
        $this->assertDatabaseHas('projects', ['name' => 'New Project']);
    }

    public function test_projects_timeline_edit_loads(): void
    {
        $project = Project::create([
            'name' => 'Timeline Project',
            'checkpoints' => [],
            'budget_items' => [],
            'start_date' => now(),
            'end_date' => now()->addMonth(),
            'budget_planned' => 0,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->get("/projects/{$project->id}/timeline");
        $response->assertOk();
    }

    // â”€â”€â”€ Roster â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_roster_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/roster');
        $response->assertOk();
    }

    public function test_roster_store_creates_entry(): void
    {
        $response = $this->actingAs($this->admin)->post('/roster', [
            'user_id' => $this->technician->id,
            'date' => now()->toDateString(),
            'shift' => 'morning',
            'time_blocks' => [['in' => '08:00', 'out' => '17:00']],
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('roster_entries', ['user_id' => $this->technician->id, 'shift' => 'morning']);
    }

    public function test_roster_delete_removes_entry(): void
    {
        $entry = RosterEntry::create([
            'user_id' => $this->technician->id,
            'date' => now()->toDateString(),
            'shift' => 'afternoon',
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->delete("/roster/{$entry->id}");
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('roster_entries', ['id' => $entry->id]);
    }

    // â”€â”€â”€ Maintenance Schedules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_maintenance_schedules_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/maintenance-schedules');
        $response->assertOk();
    }

    public function test_maintenance_schedules_create_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/maintenance-schedules/create');
        $response->assertOk();
    }

    public function test_maintenance_schedules_store_creates_record(): void
    {
        $response = $this->actingAs($this->admin)->post('/maintenance-schedules', [
            'asset_id' => $this->asset->id,
            'frequency_type' => 'monthly',
            'frequency_value' => 1,
            'next_due_date' => now()->addMonth()->toDateString(),
            'occurrences' => 1,
        ]);

        $response->assertRedirect('/maintenance-schedules');
        $this->assertDatabaseHas('maintenance_schedules', ['asset_id' => $this->asset->id]);
    }

    public function test_maintenance_schedules_edit_loads(): void
    {
        $schedule = MaintenanceSchedule::create([
            'asset_id' => $this->asset->id,
            'frequency_type' => 'weekly',
            'frequency_value' => 1,
            'next_due_date' => now()->addWeek()->toDateString(),
        ]);

        $response = $this->actingAs($this->admin)->get("/maintenance-schedules/{$schedule->id}/edit");
        $response->assertOk();
    }

    public function test_maintenance_schedules_toggle_active(): void
    {
        $schedule = MaintenanceSchedule::create([
            'asset_id' => $this->asset->id,
            'frequency_type' => 'daily',
            'frequency_value' => 1,
            'next_due_date' => now()->addDay()->toDateString(),
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->post("/maintenance-schedules/{$schedule->id}/toggle-active");
        $response->assertSessionHas('success');
        $this->assertFalse($schedule->fresh()->is_active);
    }

    public function test_maintenance_schedules_assign_technician(): void
    {
        $schedule = MaintenanceSchedule::create([
            'asset_id' => $this->asset->id,
            'frequency_type' => 'weekly',
            'frequency_value' => 1,
            'next_due_date' => now()->addWeek()->toDateString(),
        ]);

        $response = $this->actingAs($this->admin)->post("/maintenance-schedules/{$schedule->id}/assign", [
            'technician_id' => $this->technician->id,
        ]);

        $response->assertRedirect('/maintenance-schedules');
        $this->assertSame($this->technician->id, $schedule->fresh()->default_technician_id);
    }

    public function test_maintenance_schedules_assign_requires_permission(): void
    {
        $schedule = MaintenanceSchedule::create([
            'asset_id' => $this->asset->id,
            'frequency_type' => 'weekly',
            'frequency_value' => 1,
            'next_due_date' => now()->addWeek()->toDateString(),
        ]);

        $response = $this->actingAs($this->employee)->post("/maintenance-schedules/{$schedule->id}/assign", [
            'technician_id' => $this->technician->id,
        ]);

        $response->assertForbidden();
        $this->assertNull($schedule->fresh()->default_technician_id);
    }

    public function test_maintenance_schedules_assign_generates_work_order_for_due_schedule(): void
    {
        $schedule = MaintenanceSchedule::create([
            'title' => 'Daily Log Sheet Shift 1',
            'asset_id' => $this->asset->id,
            'frequency_type' => 'daily',
            'frequency_value' => 1,
            'next_due_date' => today()->toDateString(),
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->post("/maintenance-schedules/{$schedule->id}/assign", [
            'technician_id' => $this->technician->id,
        ]);

        $response->assertRedirect('/maintenance-schedules');

        $workOrder = WorkOrder::where('title', '[PM] Test Asset - Daily Log Sheet Shift 1 - '.today()->toDateString())->first();
        $this->assertNotNull($workOrder);
        $this->assertSame('assigned', $workOrder->status);
        $this->assertTrue($workOrder->technicianAssignments()->where('technician_id', $this->technician->id)->exists());
    }

    // â”€â”€â”€ My Tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_my_tasks_index_loads(): void
    {
        $response = $this->actingAs($this->technician)->get('/my-tasks');
        $response->assertOk();
    }

    public function test_my_tasks_show_loads(): void
    {
        $wo = WorkOrder::create(['requester_id' => $this->employee->id, 'title' => 'Task WO', 'status' => 'assigned']);
        $wo->technicianAssignments()->create(['technician_id' => $this->technician->id, 'scheduled_date' => now(), 'shift' => 'morning']);

        $response = $this->actingAs($this->technician)->get("/my-tasks/{$wo->id}");
        $response->assertOk();
    }

    // â”€â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_notifications_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/notifications');
        $response->assertOk();
    }

    public function test_notifications_mark_as_read(): void
    {
        $notif = Notification::create([
            'user_id' => $this->admin->id,
            'type' => 'work_order_created',
            'title' => 'Test Notif',
            'body' => 'Body',
            'data' => '{}',
        ]);

        $response = $this->actingAs($this->admin)->post("/notifications/{$notif->id}/read");
        $response->assertRedirect();
        $this->assertNotNull($notif->fresh()->read_at);
    }

    public function test_notifications_mark_all_as_read(): void
    {
        Notification::create(['user_id' => $this->admin->id, 'type' => 'test', 'title' => 'A', 'body' => 'B', 'data' => '{}']);
        Notification::create(['user_id' => $this->admin->id, 'type' => 'test', 'title' => 'C', 'body' => 'D', 'data' => '{}']);

        $response = $this->actingAs($this->admin)->post('/notifications/read-all');
        $response->assertRedirect();
        $this->assertEquals(0, Notification::where('user_id', $this->admin->id)->unread()->count());
    }

    // â”€â”€â”€ Profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_profile_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/profile');
        $response->assertOk();
    }

    public function test_profile_update_password(): void
    {
        $response = $this->actingAs($this->admin)->post('/profile/password', [
            'current_password' => 'password',
            'password' => 'NewPassword1!',
            'password_confirmation' => 'NewPassword1!',
        ]);

        $response->assertSessionHas('success');
    }

    public function test_profile_update_photo(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->admin)->post('/profile/photo', [
            'photo' => UploadedFile::fake()->create('profile.jpg', 1),
        ]);

        $response->assertSessionHas('success');
    }

    public function test_profile_update_name(): void
    {
        $response = $this->actingAs($this->admin)->post('/profile/update', [
            'name' => 'New Name',
        ]);

        $response->assertSessionHas('success');
        $this->assertEquals('New Name', $this->admin->fresh()->name);
    }

    // â”€â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_users_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/users');
        $response->assertOk();
    }

    public function test_users_create_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/users/create');
        $response->assertOk();
    }

    public function test_users_edit_loads(): void
    {
        $response = $this->actingAs($this->admin)->get("/users/{$this->employee->id}/edit");
        $response->assertOk();
    }

    public function test_users_store_creates_record(): void
    {
        $response = $this->actingAs($this->admin)->post('/users', [
            'name' => 'New User',
            'email' => 'newuser@test.com',
            'password' => 'password',
            'role' => 'technician',
            'department_id' => $this->dept->id,
        ]);

        $response->assertRedirect('/users');
        $this->assertDatabaseHas('users', ['email' => 'newuser@test.com']);
    }

    public function test_users_update_modifies_record(): void
    {
        $response = $this->actingAs($this->admin)->post("/users/{$this->employee->id}", [
            'name' => 'Updated Name',
        ]);

        $response->assertRedirect('/users');
        $this->assertEquals('Updated Name', $this->employee->fresh()->name);
    }

    // â”€â”€â”€ Budgets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_budgets_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/budgets');
        $response->assertOk();
    }

    public function test_budgets_create_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/budgets/create');
        $response->assertOk();
    }

    public function test_budgets_store_creates_record(): void
    {
        $response = $this->actingAs($this->admin)->post('/budgets', [
            'year' => now()->year,
            'month' => now()->month,
            'amount' => 10000000,
            'post_account' => null,
        ]);

        $response->assertRedirect('/budgets');
        $this->assertDatabaseHas('monthly_budgets', ['amount' => 10000000]);
    }

    public function test_budgets_edit_loads(): void
    {
        $budget = MonthlyBudget::create([
            'year' => now()->year,
            'month' => now()->month,
            'amount' => 5000000,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->get("/budgets/{$budget->id}/edit");
        $response->assertOk();
    }

    public function test_budgets_export_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/budgets/export');
        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }

    public function test_budgets_delete_removes_record(): void
    {
        $budget = MonthlyBudget::create([
            'year' => now()->year,
            'month' => now()->month,
            'amount' => 3000000,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->delete("/budgets/{$budget->id}");
        $response->assertRedirect('/budgets');
        $this->assertDatabaseMissing('monthly_budgets', ['id' => $budget->id]);
    }

    // â”€â”€â”€ Post Accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_post_accounts_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/post-accounts');
        $response->assertOk();
    }

    public function test_post_accounts_create_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/post-accounts/create');
        $response->assertOk();
    }

    public function test_post_accounts_store_creates_record(): void
    {
        $response = $this->actingAs($this->admin)->post('/post-accounts', [
            'code' => 'PA-001',
            'name' => 'Test Account',
        ]);

        $response->assertRedirect('/post-accounts');
        $this->assertDatabaseHas('post_accounts', ['code' => 'PA-001']);
    }

    public function test_post_accounts_edit_loads(): void
    {
        $account = PostAccount::create(['code' => 'PA-002', 'name' => 'Account 2', 'created_by' => $this->admin->id]);

        $response = $this->actingAs($this->admin)->get("/post-accounts/{$account->id}/edit");
        $response->assertOk();
    }

    // â”€â”€â”€ Expenses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_expenses_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/expenses');
        $response->assertOk();
    }

    public function test_expenses_create_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/expenses/create');
        $response->assertOk();
    }

    public function test_expenses_store_creates_record(): void
    {
        $response = $this->actingAs($this->admin)->post('/expenses', [
            'expense_date' => now()->toDateString(),
            'amount' => 500000,
            'status' => 'actual',
            'description' => 'Test expense',
        ]);

        $response->assertRedirect('/expenses');
        $this->assertDatabaseHas('actual_expenses', ['amount' => 500000]);
    }

    public function test_expenses_edit_loads(): void
    {
        $expense = ActualExpense::create([
            'expense_date' => now(),
            'amount' => 750000,
            'status' => 'actual',
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->get("/expenses/{$expense->id}/edit");
        $response->assertOk();
    }

    // â”€â”€â”€ Store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_store_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/store');
        $response->assertOk();
    }

    public function test_store_categories_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/store/categories');
        $response->assertOk();
    }

    public function test_store_category_create(): void
    {
        $response = $this->actingAs($this->admin)->post('/store/categories', [
            'name' => 'Cleaning Supplies',
            'type' => 'supply',
        ]);

        $response->assertRedirect('/store/categories');
        $this->assertDatabaseHas('store_categories', ['name' => 'Cleaning Supplies']);
    }

    public function test_store_category_delete(): void
    {
        $category = StoreCategory::create(['name' => 'Empty Cat', 'type' => 'tool']);

        $response = $this->actingAs($this->admin)->delete("/store/categories/{$category->id}");
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('store_categories', ['id' => $category->id]);
    }

    public function test_store_items_create_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/store/items/create');
        $response->assertOk();
    }

    public function test_store_items_store(): void
    {
        $response = $this->actingAs($this->admin)->post('/store/items', [
            'name' => 'Wrench',
            'unit' => 'pcs',
            'minimum_stock' => 5,
        ]);

        $response->assertRedirect('/store');
        $this->assertDatabaseHas('store_items', ['name' => 'Wrench']);
    }

    public function test_store_items_edit_loads(): void
    {
        $item = StoreItem::create(['name' => 'Hammer', 'unit' => 'pcs', 'stock' => 0]);

        $response = $this->actingAs($this->admin)->get("/store/items/{$item->id}/edit");
        $response->assertOk();
    }

    public function test_store_receivings_create_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/store/receivings/create');
        $response->assertOk();
    }

    public function test_store_receivings_store(): void
    {
        $item = StoreItem::create(['name' => 'Nails', 'unit' => 'kg', 'stock' => 0]);

        $response = $this->actingAs($this->admin)->post('/store/receivings', [
            'item_id' => $item->id,
            'qty_received' => 50,
            'receipt_date' => now()->toDateString(),
        ]);

        $response->assertRedirect('/store');
        $this->assertEquals(50, $item->fresh()->stock);
    }

    public function test_store_requests_create_loads(): void
    {
        $response = $this->actingAs($this->technician)->get('/store/requests/create');
        $response->assertOk();
    }

    public function test_store_requests_store(): void
    {
        $item = StoreItem::create(['name' => 'Screwdriver', 'unit' => 'pcs', 'stock' => 10]);

        $response = $this->actingAs($this->technician)->post('/store/requests', [
            'item_id' => $item->id,
            'qty_requested' => 2,
            'request_date' => now()->toDateString(),
        ]);

        $response->assertRedirect('/store');
        $this->assertDatabaseHas('store_requests', ['item_id' => $item->id, 'status' => 'pending']);
    }

    public function test_store_my_requests_loads(): void
    {
        $response = $this->actingAs($this->technician)->get('/store/my-requests');
        $response->assertOk();
    }

    public function test_store_request_approve_fulfill_reject_flow(): void
    {
        $item = StoreItem::create(['name' => 'Paint', 'unit' => 'liter', 'stock' => 20]);
        $request = StoreRequest::create([
            'item_id' => $item->id,
            'qty_requested' => 5,
            'request_date' => now(),
            'requested_by' => $this->technician->id,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->admin)->post("/store/requests/{$request->id}/approve", [
            'qty_approved' => 3,
        ]);
        $response->assertRedirect();
        $this->assertEquals('approved', $request->fresh()->status);

        $response = $this->actingAs($this->admin)->post("/store/requests/{$request->id}/fulfill");
        $response->assertRedirect();
        $this->assertEquals('fulfilled', $request->fresh()->status);
        $this->assertEquals(17, $item->fresh()->stock);
    }

    public function test_store_request_reject(): void
    {
        $item = StoreItem::create(['name' => 'Glue', 'unit' => 'pcs', 'stock' => 10]);
        $request = StoreRequest::create([
            'item_id' => $item->id,
            'qty_requested' => 1,
            'request_date' => now(),
            'requested_by' => $this->technician->id,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->admin)->post("/store/requests/{$request->id}/reject");
        $response->assertRedirect();
        $this->assertEquals('rejected', $request->fresh()->status);
    }

    public function test_store_adjustments_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/store/adjustments');
        $response->assertOk();
    }

    public function test_store_adjustment_create_and_approve(): void
    {
        $item = StoreItem::create(['name' => 'Cable', 'unit' => 'meter', 'stock' => 100]);

        $response = $this->actingAs($this->admin)->post('/store/adjustments', [
            'item_id' => $item->id,
            'qty' => -5,
            'reason' => 'Damaged stock',
        ]);
        $response->assertRedirect();
        $this->assertDatabaseHas('store_stock_adjustments', ['item_id' => $item->id, 'status' => 'pending']);

        $adjustment = StoreStockAdjustment::where('item_id', $item->id)->first();
        $ce = User::factory()->create();
        $ce->assignRole('chief-engineer');

        $response = $this->actingAs($ce)->post("/store/adjustments/{$adjustment->id}/approve");
        $response->assertRedirect();
        $this->assertEquals('approved', $adjustment->fresh()->status);
        $this->assertEquals(95, $item->fresh()->stock);
    }

    // â”€â”€â”€ Checklist Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_checklist_templates_index_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/checklist-templates');
        $response->assertOk();
    }

    public function test_checklist_templates_create_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/checklist-templates/create');
        $response->assertOk();
    }

    public function test_checklist_templates_store_creates_record(): void
    {
        $response = $this->actingAs($this->admin)->post('/checklist-templates', [
            'name' => 'HVAC Checklist',
            'asset_category' => 'HVAC',
            'fields' => [
                ['label' => 'Filter Clean', 'field_type' => 'checkbox', 'required' => true, 'sort_order' => 1],
                ['label' => 'Temperature', 'field_type' => 'number', 'required' => false, 'sort_order' => 2],
            ],
        ]);

        $response->assertRedirect('/checklist-templates');
        $this->assertDatabaseHas('checklist_templates', ['name' => 'HVAC Checklist']);
        $this->assertDatabaseHas('checklist_fields', ['label' => 'Filter Clean']);
    }

    public function test_checklist_templates_show_loads(): void
    {
        $template = ChecklistTemplate::create([
            'name' => 'Safety Check',
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->get("/checklist-templates/{$template->id}");
        $response->assertOk();
    }

    // â”€â”€â”€ Employee Cannot Access Admin Pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_employee_cannot_access_assets_index(): void
    {
        $response = $this->actingAs($this->employee)->get('/assets');
        $response->assertForbidden();
    }

    public function test_employee_cannot_access_locations(): void
    {
        $response = $this->actingAs($this->employee)->get('/locations');
        $response->assertForbidden();
    }

    public function test_employee_cannot_access_maintenance_schedules(): void
    {
        $response = $this->actingAs($this->employee)->get('/maintenance-schedules');
        $response->assertForbidden();
    }

    // â”€â”€â”€ API Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_api_telegram_link_generates_code(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/v1/telegram/link');
        $response->assertOk();
        $response->assertJsonStructure(['code', 'expires_in']);
    }

    public function test_api_telegram_status_returns_linked_false(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/v1/telegram/status');
        $response->assertOk();
        $this->assertFalse($response->json('linked'));
    }

    public function test_api_technicians_available(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/v1/technicians/available?date='.now()->toDateString().'&shift=morning');
        $response->assertOk();
    }

    public function test_api_dashboard_settings_update(): void
    {
        $response = $this->actingAs($this->admin)->putJson('/api/v1/dashboard/settings', [
            'widgets' => ['work_orders' => true],
        ]);

        $response->assertOk();
    }

    public function test_api_projects_index(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/v1/projects');
        $response->assertOk();
    }

    public function test_api_work_orders_index(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/v1/work-orders');
        $response->assertOk();
    }

    public function test_api_work_orders_store(): void
    {
        $response = $this->actingAs($this->employee)->postJson('/api/v1/work-orders', [
            'title' => 'API Created WO',
            'priority' => 'high',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('work_orders', ['title' => 'API Created WO']);
    }

    // â”€â”€â”€ Technician Access â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_technician_sees_only_own_daily_logs_page(): void
    {
        DailyLog::create(['technician_id' => $this->technician->id, 'log_date' => now(), 'activities' => 'Mine', 'hours_worked' => 4]);
        DailyLog::create(['technician_id' => $this->admin->id, 'log_date' => now(), 'activities' => 'Not mine', 'hours_worked' => 4]);

        $response = $this->actingAs($this->technician)->get('/daily-logs');
        $response->assertOk();
    }

    public function test_technician_can_access_my_tasks(): void
    {
        $response = $this->actingAs($this->technician)->get('/my-tasks');
        $response->assertOk();
    }

    public function test_work_order_checklist_pdf_downloads(): void
    {
        $template = ChecklistTemplate::create([
            'name' => 'Daily Log Sheet',
            'created_by' => $this->admin->id,
        ]);
        $field = ChecklistField::create([
            'template_id' => $template->id,
            'page' => 1,
            'label' => 'Radiator Level',
            'field_type' => 'text',
            'required' => true,
            'x' => 20,
            'y' => 30,
            'width' => 200,
        ]);
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Checklist WO',
            'status' => 'pending_check',
            'checklist_template_id' => $template->id,
        ]);
        ChecklistResponse::create([
            'work_order_id' => $wo->id,
            'field_id' => $field->id,
            'value' => 'OK',
        ]);

        $response = $this->actingAs($this->admin)->get("/work-orders/{$wo->id}/checklist-pdf");

        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }

    public function test_work_order_checklist_pdf_404_without_template(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'No Checklist WO',
            'status' => 'pending_check',
        ]);

        $response = $this->actingAs($this->admin)->get("/work-orders/{$wo->id}/checklist-pdf");

        $response->assertNotFound();
    }

    public function test_work_order_checklist_pdf_forbidden_for_unrelated_user(): void
    {
        $template = ChecklistTemplate::create([
            'name' => 'Daily Log Sheet',
            'created_by' => $this->admin->id,
        ]);
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Checklist WO',
            'status' => 'pending_check',
            'checklist_template_id' => $template->id,
        ]);

        $other = User::factory()->create();
        $other->assignRole('employee');

        $response = $this->actingAs($other)->get("/work-orders/{$wo->id}/checklist-pdf");

        $response->assertForbidden();
    }
}
