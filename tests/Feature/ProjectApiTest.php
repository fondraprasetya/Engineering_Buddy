<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Department;
use App\Models\Project;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProjectApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $employee;

    private Asset $asset;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $dept = Department::create(['name' => 'Engineering']);

        $this->admin = User::factory()->create(['department_id' => $dept->id]);
        $this->admin->assignRole('eng-admin');

        $this->employee = User::factory()->create(['department_id' => $dept->id]);
        $this->employee->assignRole('employee');

        $this->asset = Asset::create(['name' => 'Test Asset', 'code' => 'AST-001', 'category' => 'HVAC']);
    }

    public function test_can_list_projects(): void
    {
        Project::create([
            'name' => 'Project Alpha',
            'checkpoints' => [],
            'budget_items' => [],
            'start_date' => now(),
            'end_date' => now()->addMonth(),
            'budget_planned' => 0,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/v1/projects');
        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }

    public function test_can_create_project(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/v1/projects', [
            'name' => 'New Project',
            'description' => 'Test project',
            'checkpoints' => [
                ['title' => 'Start', 'due_date' => now()->addDay()->toDateString()],
                ['title' => 'End', 'due_date' => now()->addMonth()->toDateString()],
            ],
            'budget_items' => [
                ['description' => 'Materials', 'qty' => 10, 'amount' => 100000],
            ],
            'asset_id' => $this->asset->id,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('projects', ['name' => 'New Project']);
        $this->assertDatabaseHas('project_milestones', ['title' => 'Start']);
    }

    public function test_can_show_project(): void
    {
        $project = Project::create([
            'name' => 'Show Me',
            'checkpoints' => [],
            'budget_items' => [],
            'start_date' => now(),
            'end_date' => now()->addMonth(),
            'budget_planned' => 0,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/projects/{$project->id}");
        $response->assertOk();
        $this->assertEquals('Show Me', $response->json('name'));
    }

    public function test_can_add_milestone(): void
    {
        $project = Project::create([
            'name' => 'Milestone Test',
            'checkpoints' => [],
            'budget_items' => [],
            'start_date' => now(),
            'end_date' => now()->addMonth(),
            'budget_planned' => 0,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->postJson("/api/v1/projects/{$project->id}/milestones", [
            'title' => 'Phase 1',
            'due_date' => now()->addWeek()->toDateString(),
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('project_milestones', ['title' => 'Phase 1']);
    }

    public function test_can_update_milestone_status(): void
    {
        $project = Project::create([
            'name' => 'Status Test',
            'checkpoints' => [],
            'budget_items' => [],
            'start_date' => now(),
            'end_date' => now()->addMonth(),
            'budget_planned' => 0,
            'created_by' => $this->admin->id,
        ]);

        $milestone = $project->milestones()->create(['title' => 'Phase 1', 'due_date' => now()->addWeek()]);

        $response = $this->actingAs($this->admin)->putJson("/api/v1/milestones/{$milestone->id}/status", [
            'status' => 'completed',
        ]);

        $response->assertOk();
        $this->assertEquals('completed', $milestone->fresh()->status);
    }

    public function test_can_upload_milestone_photo(): void
    {
        Storage::fake('public');

        $project = Project::create([
            'name' => 'Photo Test',
            'checkpoints' => [],
            'budget_items' => [],
            'start_date' => now(),
            'end_date' => now()->addMonth(),
            'budget_planned' => 0,
            'created_by' => $this->admin->id,
        ]);

        $milestone = $project->milestones()->create(['title' => 'Phase 1', 'due_date' => now()->addWeek()]);

        $response = $this->actingAs($this->admin)->postJson("/api/v1/milestones/{$milestone->id}/photo", [
            'photo' => UploadedFile::fake()->create('milestone.jpg', 1),
        ]);

        $response->assertOk();
        $this->assertNotNull($milestone->fresh()->photos);
    }

    public function test_can_update_budget_items(): void
    {
        $project = Project::create([
            'name' => 'Budget Test',
            'checkpoints' => [],
            'budget_items' => [['description' => 'Old', 'qty' => 1, 'amount' => 1000]],
            'start_date' => now(),
            'end_date' => now()->addMonth(),
            'budget_planned' => 1000,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/v1/projects/{$project->id}/budget-items", [
            'budget_items' => [
                ['description' => 'Updated Item', 'qty' => 2, 'amount' => 500000, 'actual_amount' => 0],
            ],
        ]);

        $response->assertOk();
        $this->assertEquals(1000000, $project->fresh()->budget_planned);
    }

    public function test_employee_cannot_create_project(): void
    {
        $response = $this->actingAs($this->employee)->postJson('/api/v1/projects', [
            'name' => 'Hacked',
            'checkpoints' => [['title' => 'X', 'due_date' => now()->toDateString()]],
            'budget_items' => [['description' => 'X', 'qty' => 1, 'amount' => 1]],
        ]);

        $response->assertForbidden();
    }

    public function test_requires_checkpoints_and_budget_items(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/v1/projects', [
            'name' => 'Incomplete',
        ]);

        $response->assertStatus(422);
    }

    public function test_budget_items_with_actual_creates_expense(): void
    {
        $project = Project::create([
            'name' => 'Expense Test',
            'checkpoints' => [],
            'budget_items' => [],
            'start_date' => now(),
            'end_date' => now()->addMonth(),
            'budget_planned' => 0,
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)->putJson("/api/v1/projects/{$project->id}/budget-items", [
            'budget_items' => [
                ['description' => 'Concrete', 'qty' => 10, 'amount' => 50000, 'actual_amount' => 550000],
            ],
        ]);

        $this->assertDatabaseHas('actual_expenses', [
            'project_id' => $project->id,
            'amount' => 550000,
        ]);
    }
}
