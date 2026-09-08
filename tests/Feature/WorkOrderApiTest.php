<?php

namespace Tests\Feature;

use App\Models\ChecklistField;
use App\Models\ChecklistTemplate;
use App\Models\Department;
use App\Models\TelegramLink;
use App\Models\User;
use App\Models\WorkOrder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WorkOrderApiTest extends TestCase
{
    use RefreshDatabase;

    private Department $dept;

    private User $employee;

    private User $deptHead;

    private User $chiefEngineer;

    private User $engAdmin;

    private User $technician;

    private User $gm;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->dept = Department::create(['name' => 'Test Dept']);

        $this->employee = User::factory()->create(['department_id' => $this->dept->id]);
        $this->employee->assignRole('employee');

        $this->deptHead = User::factory()->create(['department_id' => $this->dept->id]);
        $this->deptHead->assignRole('dept-head');

        $this->chiefEngineer = User::factory()->create();
        $this->chiefEngineer->assignRole('chief-engineer');

        $this->engAdmin = User::factory()->create();
        $this->engAdmin->assignRole('eng-admin');

        $this->technician = User::factory()->create();
        $this->technician->assignRole('technician');

        $this->gm = User::factory()->create();
        $this->gm->assignRole('gm');
    }

    public function test_employee_can_list_own_work_orders(): void
    {
        WorkOrder::create(['requester_id' => $this->employee->id, 'title' => 'Mine', 'status' => 'pending_dept_head']);
        WorkOrder::create(['requester_id' => $this->employee->id, 'title' => 'Mine 2', 'status' => 'pending_dept_head']);

        $response = $this->actingAs($this->employee)->getJson('/api/v1/work-orders');

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
    }

    public function test_employee_cannot_see_other_work_orders(): void
    {
        $other = User::factory()->create(['department_id' => $this->dept->id]);
        $other->assignRole('employee');

        WorkOrder::create(['requester_id' => $other->id, 'title' => 'Not mine', 'status' => 'pending_dept_head']);

        $response = $this->actingAs($this->employee)->getJson('/api/v1/work-orders');

        $response->assertOk();
        $response->assertJsonCount(0, 'data');
    }

    public function test_technician_cannot_approve_work_order(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'pending_dept_head',
        ]);

        $response = $this->actingAs($this->technician)->postJson("/api/v1/work-orders/{$wo->id}/approve");

        $response->assertForbidden();
    }

    public function test_dept_head_can_approve_own_dept(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'pending_dept_head',
        ]);

        $response = $this->actingAs($this->deptHead)->postJson("/api/v1/work-orders/{$wo->id}/approve");

        $response->assertOk();
        $this->assertEquals('pending_chief_engineer', $wo->fresh()->status);
    }

    public function test_dept_head_cannot_approve_other_dept(): void
    {
        $otherDept = Department::create(['name' => 'Other']);
        $otherUser = User::factory()->create(['department_id' => $otherDept->id]);
        $otherUser->assignRole('employee');

        $wo = WorkOrder::create([
            'requester_id' => $otherUser->id,
            'title' => 'Test',
            'status' => 'pending_dept_head',
        ]);

        $response = $this->actingAs($this->deptHead)->postJson("/api/v1/work-orders/{$wo->id}/approve");

        $response->assertStatus(422);
    }

    public function test_chief_engineer_can_approve_second_gate(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'pending_chief_engineer',
        ]);

        $response = $this->actingAs($this->chiefEngineer)->postJson("/api/v1/work-orders/{$wo->id}/approve", [
            'completion_target_date' => now()->addWeek()->toDateString(),
        ]);

        $response->assertOk();
        $this->assertEquals('approved', $wo->fresh()->status);
    }

    public function test_gm_cannot_create_work_order(): void
    {
        $response = $this->actingAs($this->gm)->postJson('/api/v1/work-orders', [
            'title' => 'Test',
            'priority' => 'medium',
        ]);

        $response->assertForbidden();
    }

    public function test_eng_admin_can_assign_technician(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'approved',
        ]);

        $response = $this->actingAs($this->engAdmin)->postJson("/api/v1/work-orders/{$wo->id}/assign", [
            'technician_id' => $this->technician->id,
            'scheduled_date' => now()->addDay()->toDateString(),
            'shift' => 'morning',
        ]);

        $response->assertOk();
        $this->assertEquals('assigned', $wo->fresh()->status);
    }

    public function test_employee_cannot_assign_technician(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'approved',
        ]);

        $response = $this->actingAs($this->employee)->postJson("/api/v1/work-orders/{$wo->id}/assign", [
            'technician_id' => $this->technician->id,
            'scheduled_date' => now()->addDay()->toDateString(),
            'shift' => 'morning',
        ]);

        $response->assertForbidden();
    }

    public function test_technician_can_submit_checklist_responses(): void
    {
        $template = ChecklistTemplate::create([
            'name' => 'Test Template',
            'asset_category' => 'test',
            'created_by' => $this->engAdmin->id,
        ]);
        $field = ChecklistField::create([
            'template_id' => $template->id,
            'page' => 1,
            'label' => 'Reading',
            'field_type' => 'number',
            'required' => true,
            'x' => 20,
            'y' => 30,
            'width' => 200,
        ]);
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'in_progress',
            'checklist_template_id' => $template->id,
        ]);

        $response = $this->actingAs($this->technician)->postJson("/api/v1/work-orders/{$wo->id}/checklist-responses", [
            'responses' => [
                ['field_id' => $field->id, 'value' => '42'],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('checklist_responses', [
            'work_order_id' => $wo->id,
            'field_id' => $field->id,
            'value' => '42',
        ]);
    }

    public function test_technician_can_upload_checklist_photo(): void
    {
        $template = ChecklistTemplate::create([
            'name' => 'Test Template',
            'asset_category' => 'test',
            'created_by' => $this->engAdmin->id,
        ]);
        ChecklistField::create([
            'template_id' => $template->id,
            'page' => 1,
            'label' => 'Photo',
            'field_type' => 'photo',
            'required' => false,
            'x' => 20,
            'y' => 30,
            'width' => 200,
        ]);
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'in_progress',
            'checklist_template_id' => $template->id,
        ]);

        $photoPath = tempnam(sys_get_temp_dir(), 'photo').'.png';
        file_put_contents($photoPath, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', true));
        $photo = new UploadedFile($photoPath, 'readout.png', 'image/png', null, true);

        $response = $this->actingAs($this->technician)->postJson("/api/v1/work-orders/{$wo->id}/checklist-photo", [
            'photo' => $photo,
        ]);

        $response->assertOk();
        $this->assertNotNull($response->json('url'));
        $this->assertStringStartsWith('/storage/checklist-photos/', $response->json('url'));
    }

    public function test_employee_cannot_submit_checklist_responses(): void
    {
        $template = ChecklistTemplate::create([
            'name' => 'Test Template',
            'asset_category' => 'test',
            'created_by' => $this->engAdmin->id,
        ]);
        $field = ChecklistField::create([
            'template_id' => $template->id,
            'page' => 1,
            'label' => 'Reading',
            'field_type' => 'number',
            'required' => true,
            'x' => 20,
            'y' => 30,
            'width' => 200,
        ]);
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'in_progress',
            'checklist_template_id' => $template->id,
        ]);

        $response = $this->actingAs($this->employee)->postJson("/api/v1/work-orders/{$wo->id}/checklist-responses", [
            'responses' => [
                ['field_id' => $field->id, 'value' => '42'],
            ],
        ]);

        $response->assertForbidden();
    }

    public function test_approve_succeeds_when_telegram_is_unreachable(): void
    {
        Http::fake(fn () => throw new ConnectionException('Recv failure: Connection was reset'));

        TelegramLink::create([
            'user_id' => $this->employee->id,
            'chat_id' => 123456789,
            'linked_at' => now(),
        ]);
        TelegramLink::create([
            'user_id' => $this->deptHead->id,
            'chat_id' => 987654321,
            'linked_at' => now(),
        ]);

        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'pending_dept_head',
        ]);

        $response = $this->actingAs($this->deptHead)->postJson("/api/v1/work-orders/{$wo->id}/approve");

        $response->assertOk();
        $this->assertEquals('pending_chief_engineer', $wo->fresh()->status);
    }
}
