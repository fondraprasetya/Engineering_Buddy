<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Department;
use App\Models\Location;
use App\Models\TelegramLink;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\TelegramService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TelegramTest extends TestCase
{
    use RefreshDatabase;

    private Department $dept;

    private User $employee;

    private User $technician;

    private Asset $asset;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->dept = Department::create(['name' => 'Test']);

        $this->employee = User::factory()->create(['department_id' => $this->dept->id]);
        $this->employee->assignRole('employee');

        $this->technician = User::factory()->create(['department_id' => $this->dept->id]);
        $this->technician->assignRole('technician');

        $this->asset = Asset::create([
            'name' => 'Test Asset', 'code' => 'TST-001', 'category' => 'HVAC',
        ]);

        Http::fake();
    }

    public function test_generate_link_code(): void
    {
        $response = $this->actingAs($this->employee)->postJson('/api/v1/telegram/link');

        $response->assertOk();
        $response->assertJsonStructure(['code', 'expires_in', 'message']);
        $this->assertDatabaseHas('telegram_links', [
            'user_id' => $this->employee->id,
        ]);
    }

    public function test_verify_link_code(): void
    {
        $service = app(TelegramService::class);
        $code = $service->generateLinkCode($this->employee);

        $user = $service->verifyLinkCode($code, 123456789);

        $this->assertNotNull($user);
        $this->assertEquals($this->employee->id, $user->id);
        $this->assertDatabaseHas('telegram_links', [
            'user_id' => $this->employee->id,
            'chat_id' => 123456789,
        ]);
    }

    public function test_verify_expired_code_returns_null(): void
    {
        $service = app(TelegramService::class);
        $code = $service->generateLinkCode($this->employee);

        TelegramLink::where('user_id', $this->employee->id)->update([
            'link_code_expires_at' => now()->subMinute(),
        ]);

        $user = $service->verifyLinkCode($code, 123456789);

        $this->assertNull($user);
    }

    public function test_telegram_link_status(): void
    {
        $service = app(TelegramService::class);
        $service->generateLinkCode($this->employee);
        $service->verifyLinkCode(
            TelegramLink::where('user_id', $this->employee->id)->value('link_code'),
            12345
        );

        $response = $this->actingAs($this->employee)->getJson('/api/v1/telegram/status');

        $response->assertOk();
        $this->assertTrue($response->json('linked'));
    }

    public function test_handle_myorders_command(): void
    {
        WorkOrder::create(['requester_id' => $this->employee->id, 'title' => 'Order 1', 'status' => 'pending_dept_head']);
        WorkOrder::create(['requester_id' => $this->employee->id, 'title' => 'Order 2', 'status' => 'approved']);

        $service = app(TelegramService::class);
        $service->generateLinkCode($this->employee);
        $service->verifyLinkCode(
            TelegramLink::where('user_id', $this->employee->id)->value('link_code'),
            12345
        );

        $result = $service->handleWebhook([
            'message' => [
                'chat' => ['id' => 12345],
                'text' => '/myorders',
            ],
        ]);

        $this->assertNotNull($result);
    }

    public function test_handle_report_command(): void
    {
        $service = app(TelegramService::class);
        $chatId = 999888;
        $service->generateLinkCode($this->technician);
        $service->verifyLinkCode(
            TelegramLink::where('user_id', $this->technician->id)->value('link_code'),
            $chatId
        );

        $service->handleWebhook([
            'message' => [
                'chat' => ['id' => $chatId],
                'text' => '/report Checked pressure gauges on AHU-001',
            ],
        ]);

        $this->assertDatabaseHas('daily_logs', [
            'technician_id' => $this->technician->id,
            'activities' => 'Checked pressure gauges on AHU-001',
        ]);
    }

    public function test_handle_create_command(): void
    {
        $service = app(TelegramService::class);
        $service->generateLinkCode($this->employee);
        $service->verifyLinkCode(
            TelegramLink::where('user_id', $this->employee->id)->value('link_code'),
            12345
        );

        $result = $service->handleWebhook([
            'message' => [
                'chat' => ['id' => 12345],
                'text' => '/workorder urgent Roof leaking',
            ],
        ]);

        $this->assertNotNull($result);
        $this->assertDatabaseHas('work_orders', [
            'requester_id' => $this->employee->id,
            'title' => 'Roof leaking',
            'priority' => 'urgent',
            'status' => 'pending_dept_head',
        ]);
    }

    public function test_handle_create_default_priority(): void
    {
        $service = app(TelegramService::class);
        $service->generateLinkCode($this->employee);
        $service->verifyLinkCode(
            TelegramLink::where('user_id', $this->employee->id)->value('link_code'),
            12345
        );

        $result = $service->handleWebhook([
            'message' => [
                'chat' => ['id' => 12345],
                'text' => '/workorder Broken faucet in Room 301',
            ],
        ]);

        $this->assertNotNull($result);
        $this->assertDatabaseHas('work_orders', [
            'requester_id' => $this->employee->id,
            'title' => 'Broken faucet in Room 301',
            'priority' => 'medium',
            'status' => 'pending_dept_head',
        ]);
    }

    public function test_create_conversation_full_flow(): void
    {
        $service = app(TelegramService::class);
        $service->generateLinkCode($this->employee);
        $service->verifyLinkCode(
            TelegramLink::where('user_id', $this->employee->id)->value('link_code'),
            12345
        );

        $testLocation = Location::create([
            'name' => 'Building A, 3rd Floor', 'type' => 'room', 'code' => 'BLD-A-301',
        ]);

        // Step 1: /workorder with no args → starts conversation
        $result = $service->handleWebhook([
            'message' => [
                'chat' => ['id' => 12345],
                'text' => '/workorder',
            ],
        ]);
        $this->assertNotNull($result);

        // Step 2: enter title
        $result = $service->handleWebhook([
            'message' => [
                'chat' => ['id' => 12345],
                'text' => 'Fix AC Unit on 3rd Floor',
            ],
        ]);
        $this->assertNotNull($result);

        // Step 3: callback query with priority
        $result = $service->handleWebhook([
            'callback_query' => [
                'id' => 'cb1',
                'data' => 'priority:urgent',
                'message' => [
                    'chat' => ['id' => 12345],
                    'message_id' => 1,
                ],
            ],
        ]);
        $this->assertNotNull($result);

        // Step 4: callback query — select asset by ID
        $result = $service->handleWebhook([
            'callback_query' => [
                'id' => 'cb2',
                'data' => 'asset_select:'.$this->asset->id,
                'message' => [
                    'chat' => ['id' => 12345],
                    'message_id' => 2,
                ],
            ],
        ]);
        $this->assertNotNull($result);

        // Step 5: callback query — select location by ID
        $result = $service->handleWebhook([
            'callback_query' => [
                'id' => 'cb3',
                'data' => 'loc_select:'.$testLocation->id,
                'message' => [
                    'chat' => ['id' => 12345],
                    'message_id' => 3,
                ],
            ],
        ]);
        $this->assertNotNull($result);

        // Step 6: callback query — skip photo
        $result = $service->handleWebhook([
            'callback_query' => [
                'id' => 'cb4',
                'data' => 'photo:skip',
                'message' => [
                    'chat' => ['id' => 12345],
                    'message_id' => 4,
                ],
            ],
        ]);
        $this->assertNotNull($result);

        // Step 7: callback query — confirm
        $result = $service->handleWebhook([
            'callback_query' => [
                'id' => 'cb5',
                'data' => 'wo_confirm:1',
                'message' => [
                    'chat' => ['id' => 12345],
                    'message_id' => 5,
                ],
            ],
        ]);
        $this->assertNotNull($result);

        // Assert work order was created with all fields
        $this->assertDatabaseHas('work_orders', [
            'requester_id' => $this->employee->id,
            'title' => 'Fix AC Unit on 3rd Floor',
            'priority' => 'urgent',
            'status' => 'pending_dept_head',
            'asset_id' => $this->asset->id,
            'location_id' => $testLocation->id,
        ]);
    }

    public function test_create_conversation_cancel_midway(): void
    {
        $service = app(TelegramService::class);
        $service->generateLinkCode($this->employee);
        $service->verifyLinkCode(
            TelegramLink::where('user_id', $this->employee->id)->value('link_code'),
            12345
        );

        // Start conversation
        $service->handleWebhook([
            'message' => [
                'chat' => ['id' => 12345],
                'text' => '/workorder',
            ],
        ]);

        // Enter title
        $service->handleWebhook([
            'message' => [
                'chat' => ['id' => 12345],
                'text' => 'Test WO to cancel',
            ],
        ]);

        // Cancel mid-flow
        $result = $service->handleWebhook([
            'message' => [
                'chat' => ['id' => 12345],
                'text' => 'cancel',
            ],
        ]);

        $this->assertNotNull($result);
        $this->assertDatabaseMissing('work_orders', [
            'title' => 'Test WO to cancel',
        ]);
    }

    public function test_work_order_command_with_args(): void
    {
        $service = app(TelegramService::class);
        $service->generateLinkCode($this->employee);
        $service->verifyLinkCode(
            TelegramLink::where('user_id', $this->employee->id)->value('link_code'),
            12345
        );

        $result = $service->handleWebhook([
            'message' => [
                'chat' => ['id' => 12345],
                'text' => '/work order urgent Roof leaking',
            ],
        ]);

        $this->assertNotNull($result);
        $this->assertDatabaseHas('work_orders', [
            'requester_id' => $this->employee->id,
            'title' => 'Roof leaking',
            'priority' => 'urgent',
            'status' => 'pending_dept_head',
        ]);
    }

    public function test_create_conversation_no_args_starts_conversation(): void
    {
        $service = app(TelegramService::class);
        $service->generateLinkCode($this->employee);
        $service->verifyLinkCode(
            TelegramLink::where('user_id', $this->employee->id)->value('link_code'),
            12345
        );

        // /workorder with no args should start conversation, not error
        $result = $service->handleWebhook([
            'message' => [
                'chat' => ['id' => 12345],
                'text' => '/workorder',
            ],
        ]);

        $this->assertNotNull($result);
    }

    public function test_unlinked_user_gets_prompt(): void
    {
        $service = app(TelegramService::class);

        $result = $service->handleWebhook([
            'message' => [
                'chat' => ['id' => 99999],
                'text' => '/myorders',
            ],
        ]);

        $this->assertNotNull($result);
    }
}
