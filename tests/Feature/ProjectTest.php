<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Project;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectTest extends TestCase
{
    use RefreshDatabase;

    private User $engAdmin;

    private User $gm;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $dept = Department::create(['name' => 'Test']);

        $this->engAdmin = User::factory()->create(['department_id' => $dept->id]);
        $this->engAdmin->assignRole('eng-admin');

        $this->gm = User::factory()->create();
        $this->gm->assignRole('gm');
    }

    public function test_eng_admin_can_create_project(): void
    {
        $response = $this->actingAs($this->engAdmin)->postJson('/api/v1/projects', [
            'name' => 'Plant Upgrade 2026',
            'checkpoints' => [
                ['title' => 'Start', 'due_date' => now()->toDateString()],
                ['title' => 'Complete', 'due_date' => now()->addMonths(6)->toDateString()],
            ],
            'budget_items' => [['description' => 'Equipment', 'qty' => 2, 'amount' => 25000]],
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('projects', ['name' => 'Plant Upgrade 2026']);
    }

    public function test_gm_can_view_projects(): void
    {
        Project::create(['name' => 'Project A', 'start_date' => now(), 'end_date' => now()->addMonth(), 'budget_planned' => 1000, 'created_by' => $this->engAdmin->id]);
        Project::create(['name' => 'Project B', 'start_date' => now(), 'end_date' => now()->addMonth(), 'budget_planned' => 2000, 'created_by' => $this->engAdmin->id]);

        $response = $this->actingAs($this->gm)->getJson('/api/v1/projects');

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
    }

    public function test_gm_cannot_create_project(): void
    {
        $response = $this->actingAs($this->gm)->postJson('/api/v1/projects', [
            'name' => 'Should not work',
            'checkpoints' => [
                ['title' => 'Start', 'due_date' => now()->toDateString()],
                ['title' => 'End', 'due_date' => now()->addMonth()->toDateString()],
            ],
            'budget_items' => [['description' => 'Item', 'qty' => 1, 'amount' => 1000]],
        ]);

        $response->assertForbidden();
    }

    public function test_project_budget_tracking(): void
    {
        $project = Project::create([
            'name' => 'Budget Test',
            'start_date' => now(),
            'end_date' => now()->addMonth(),
            'budget_planned' => 10000,
            'budget_actual' => 2500,
            'created_by' => $this->engAdmin->id,
        ]);

        $response = $this->actingAs($this->engAdmin)->getJson("/api/v1/projects/{$project->id}");

        $response->assertOk();
        $this->assertEquals(10000, $response->json('budget_planned'));
        $this->assertEquals(2500, $response->json('budget_actual'));
    }

    public function test_eng_admin_can_add_milestone(): void
    {
        $project = Project::create([
            'name' => 'Milestone Test',
            'start_date' => now(),
            'end_date' => now()->addMonth(),
            'budget_planned' => 5000,
            'created_by' => $this->engAdmin->id,
        ]);

        $response = $this->actingAs($this->engAdmin)->postJson("/api/v1/projects/{$project->id}/milestones", [
            'title' => 'Foundation complete',
            'due_date' => now()->addWeeks(2)->toDateString(),
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('project_milestones', ['project_id' => $project->id, 'title' => 'Foundation complete']);
    }

    public function test_project_requires_end_date_after_start(): void
    {
        $response = $this->actingAs($this->engAdmin)->postJson('/api/v1/projects', [
            'name' => 'Bad dates',
            'checkpoints' => [['title' => 'Only one']],
            'budget_items' => [['description' => 'Item', 'qty' => 1, 'amount' => 1000]],
        ]);

        $response->assertStatus(422);
    }
}
