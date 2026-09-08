<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\WorkOrderService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class WorkOrderStateMachineTest extends TestCase
{
    use RefreshDatabase;

    private WorkOrderService $service;

    private Department $dept;

    private User $employee;

    private User $deptHead;

    private User $chiefEngineer;

    private User $engAdmin;

    private User $technician;

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

        $this->service = app(WorkOrderService::class);
    }

    public function test_employee_can_create_work_order(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test Work Order',
            'status' => 'pending_dept_head',
        ]);

        $this->assertEquals('pending_dept_head', $wo->status);
    }

    public function test_valid_transition_draft_to_pending_dept_head(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'draft',
        ]);

        $result = $this->service->transition($wo, 'pending_dept_head');

        $this->assertEquals('pending_dept_head', $result->status);
    }

    public function test_valid_transition_pending_dept_head_to_pending_chief_engineer(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'pending_dept_head',
        ]);

        $result = $this->service->approve($wo, $this->deptHead);

        $this->assertEquals('pending_chief_engineer', $result->status);
    }

    public function test_valid_transition_through_full_chain(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Full chain test',
            'status' => 'pending_dept_head',
        ]);

        $wo = $this->service->approve($wo, $this->deptHead);
        $this->assertEquals('pending_chief_engineer', $wo->status);

        $wo = $this->service->approve($wo, $this->chiefEngineer, null, now()->addWeek()->toDateString());
        $this->assertEquals('approved', $wo->status);

        $wo = $this->service->assign($wo, $this->engAdmin, $this->technician->id, now()->addDay()->toDateString(), 'morning');
        $this->assertEquals('assigned', $wo->status);

        $wo = $this->service->transition($wo, 'in_progress');
        $this->assertEquals('in_progress', $wo->status);

        $wo = $this->service->transition($wo, 'pending_check');
        $this->assertEquals('pending_check', $wo->status);

        $wo = $this->service->transition($wo, 'completed');
        $this->assertEquals('completed', $wo->status);
    }

    public function test_invalid_transition_throws_error(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'draft',
        ]);

        $this->expectException(ValidationException::class);

        $this->service->transition($wo, 'approved');
    }

    public function test_invalid_transition_from_rejected_throws_error(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'rejected',
        ]);

        $this->expectException(ValidationException::class);

        $this->service->transition($wo, 'pending_dept_head');
    }

    public function test_dept_head_reject_requires_comment(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'pending_dept_head',
        ]);

        $this->expectException(ValidationException::class);

        $this->service->reject($wo, $this->deptHead, '');
    }

    public function test_dept_head_reject_creates_approval_record(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'pending_dept_head',
        ]);

        $this->service->reject($wo, $this->deptHead, 'Not needed right now');

        $this->assertEquals('rejected', $wo->fresh()->status);
        $this->assertDatabaseHas('work_order_approvals', [
            'work_order_id' => $wo->id,
            'approver_id' => $this->deptHead->id,
            'level' => 1,
            'action' => 'rejected',
            'comment' => 'Not needed right now',
        ]);
    }

    public function test_technician_cannot_approve(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Test',
            'status' => 'pending_dept_head',
        ]);

        $this->expectException(ValidationException::class);

        $this->service->approve($wo, $this->technician);
    }

    public function test_technician_requester_dept_head_gate_handled_by_chief_engineer(): void
    {
        $techRequester = User::factory()->create(['department_id' => $this->dept->id]);
        $techRequester->assignRole('technician');

        $wo = WorkOrder::create([
            'requester_id' => $techRequester->id,
            'title' => 'Tech Request',
            'status' => 'pending_dept_head',
        ]);

        $this->assertEquals('chief-engineer', $this->service->reviewerRole($wo));

        try {
            $this->service->approve($wo, $this->deptHead);
            $this->fail('Dept head should not be able to approve a technician request.');
        } catch (ValidationException) {
        }

        $this->service->approve($wo, $this->chiefEngineer);

        $this->assertEquals('pending_chief_engineer', $wo->fresh()->status);
    }

    public function test_technician_requester_completion_verified_by_chief_engineer(): void
    {
        $techRequester = User::factory()->create(['department_id' => $this->dept->id]);
        $techRequester->assignRole('technician');

        $wo = WorkOrder::create([
            'requester_id' => $techRequester->id,
            'title' => 'Tech Request',
            'status' => 'pending_check',
        ]);

        $this->assertEquals('chief-engineer', $this->service->reviewerRole($wo));

        try {
            $this->service->approve($wo, $this->deptHead);
            $this->fail('Dept head should not be able to verify a technician request.');
        } catch (ValidationException) {
        }

        $this->service->approve($wo, $this->chiefEngineer);

        $this->assertEquals('completed', $wo->fresh()->status);
    }

    public function test_technician_requester_rejected_by_chief_engineer(): void
    {
        $techRequester = User::factory()->create(['department_id' => $this->dept->id]);
        $techRequester->assignRole('technician');

        $wo = WorkOrder::create([
            'requester_id' => $techRequester->id,
            'title' => 'Tech Request',
            'status' => 'pending_check',
        ]);

        try {
            $this->service->reject($wo, $this->deptHead, 'Not correct');
            $this->fail('Dept head should not be able to reject a technician request.');
        } catch (ValidationException) {
        }

        $this->service->reject($wo, $this->chiefEngineer, 'Not correct');

        $this->assertEquals('in_progress', $wo->fresh()->status);
    }

    public function test_employee_requester_still_reviewed_by_dept_head(): void
    {
        $wo = WorkOrder::create([
            'requester_id' => $this->employee->id,
            'title' => 'Employee Request',
            'status' => 'pending_dept_head',
        ]);

        $this->assertEquals('dept-head', $this->service->reviewerRole($wo));

        $this->service->approve($wo, $this->deptHead);

        $this->assertEquals('pending_chief_engineer', $wo->fresh()->status);
    }
}
