<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    private const array TELEGRAM_TYPES = [
        'work_order_submitted' => "📋 Work Order #:work_order_id — Submitted\n\n<b>Title:</b> :title\n<b>Requester:</b> :requester\n<b>Department:</b> :department\n<b>Priority:</b> :priority\n<b>Asset:</b> :asset\n<b>Location:</b> :location\n<b>Created:</b> :created",
        'work_order_approved_dept' => "📋 Work Order #:work_order_id — Approved by Dept Head\n\n<b>Title:</b> :title\n<b>Requester:</b> :requester\n<b>Department:</b> :department\n<b>Priority:</b> :priority\n<b>Asset:</b> :asset\n<b>Location:</b> :location\n<b>Created:</b> :created",
        'work_order_approved_chief' => "📋 Work Order #:work_order_id — Fully Approved\n\n<b>Title:</b> :title\n<b>Requester:</b> :requester\n<b>Department:</b> :department\n<b>Priority:</b> :priority\n<b>Asset:</b> :asset\n<b>Location:</b> :location\n<b>Created:</b> :created",
        'work_order_rejected' => "📋 Work Order #:work_order_id — Rejected\n\n<b>Title:</b> :title\n<b>Requester:</b> :requester\n<b>Department:</b> :department\n<b>Priority:</b> :priority\n<b>Asset:</b> :asset\n<b>Location:</b> :location\n<b>Created:</b> :created",
        'work_order_assigned' => "📋 Work Order #:work_order_id — Assigned\n\n<b>Title:</b> :title\n<b>Requester:</b> :requester\n<b>Department:</b> :department\n<b>Priority:</b> :priority\n<b>Asset:</b> :asset\n<b>Location:</b> :location\n<b>Created:</b> :created",
        'work_order_sent_back' => "📋 Work Order #:work_order_id — Sent Back for Revision\n\n<b>Title:</b> :title\n<b>Requester:</b> :requester\n<b>Department:</b> :department\n<b>Priority:</b> :priority\n<b>Asset:</b> :asset\n<b>Location:</b> :location\n<b>Created:</b> :created",
        'work_order_pending_check' => "📋 Work Order #:work_order_id — Pending Verification\n\n<b>Title:</b> :title\n<b>Requester:</b> :requester\n<b>Department:</b> :department\n<b>Priority:</b> :priority\n<b>Asset:</b> :asset\n<b>Location:</b> :location\n<b>Created:</b> :created",
        'work_order_completed' => "📋 Work Order #:work_order_id — Completed\n\n<b>Title:</b> :title\n<b>Requester:</b> :requester\n<b>Department:</b> :department\n<b>Priority:</b> :priority\n<b>Asset:</b> :asset\n<b>Location:</b> :location\n<b>Created:</b> :created",
        'work_order_pending_close' => "📋 Work Order #:work_order_id — Close Requested\n\n<b>Title:</b> :title\n<b>Requester:</b> :requester\n<b>Department:</b> :department\n<b>Priority:</b> :priority\n<b>Asset:</b> :asset\n<b>Location:</b> :location\n<b>Created:</b> :created",
        'work_order_closed' => "📋 Work Order #:work_order_id — Closed\n\n<b>Title:</b> :title\n<b>Requester:</b> :requester\n<b>Department:</b> :department\n<b>Priority:</b> :priority\n<b>Asset:</b> :asset\n<b>Location:</b> :location\n<b>Created:</b> :created",
        'maintenance_due' => '🔧 Maintenance Due\n\n<b>Asset:</b> :asset_name\n<b>Schedule:</b> :title',
        'stock_adjustment_submitted' => '📦 Stock Adjustment Submitted\n\n<b>Item:</b> :item_name\n<b>Qty:</b> :qty\n<b>By:</b> :submitted_by',
        'stock_adjustment_approved' => '📦 Stock Adjustment Approved\n\n<b>Item:</b> :item_name\n<b>Qty:</b> :qty\n<b>Approved by:</b> :approved_by',
        'stock_adjustment_rejected' => '📦 Stock Adjustment Rejected\n\n<b>Item:</b> :item_name\n<b>Qty:</b> :qty\n<b>Rejected by:</b> :rejected_by',
        'store_request_submitted' => "📋 Store Request #:request_id — Submitted\n\n<b>Item:</b> :item_name\n<b>Quantity:</b> :qty pcs\n<b>Requested by:</b> :requested_by\n<b>Status:</b> Pending Approval",
        'store_request_approved' => "✅ Store Request #:request_id — Approved\n\n<b>Item:</b> :item_name\n<b>Quantity Requested:</b> :qty pcs\n<b>Quantity Approved:</b> :qty_approved pcs\n<b>Approved by:</b> :approved_by\n<b>Status:</b> Awaiting Fulfillment",
        'store_request_fulfilled' => "📦 Store Request #:request_id — Fulfilled\n\n<b>Item:</b> :item_name\n<b>Quantity:</b> :qty pcs\n<b>Fulfilled by:</b> :fulfilled_by\n<b>Status:</b> Completed",
        'store_request_rejected' => "❌ Store Request #:request_id — Rejected\n\n<b>Item:</b> :item_name\n<b>Quantity:</b> :qty pcs\n<b>Rejected by:</b> :rejected_by\n<b>Status:</b> Rejected",
    ];

    public function __construct(
        private readonly TelegramService $telegram,
    ) {}

    public function send(User $user, string $type, array $data): Notification
    {
        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => $type,
            'data' => $data,
        ]);

        $this->sendTelegramIfLinked($user, $type, $data);

        return $notification;
    }

    private function sendTelegramIfLinked(User $user, string $type, array $data): void
    {
        if (! $this->telegram->isConfigured()) {
            return;
        }

        $template = self::TELEGRAM_TYPES[$type] ?? null;
        if (! $template) {
            return;
        }

        $photoPath = $data['photo_path'] ?? null;
        unset($data['photo_path']);

        $keyboard = $data['keyboard'] ?? null;
        unset($data['keyboard']);

        $text = $template;
        foreach ($data as $key => $value) {
            $text = str_replace(":{$key}", (string) $value, $text);
        }

        $link = $user->telegramLink()->whereNotNull('linked_at')->first();
        if (! $link?->chat_id) {
            return;
        }

        try {
            if ($photoPath) {
                $this->telegram->sendPhoto($link->chat_id, $photoPath, $text, $keyboard);
            } else {
                $this->telegram->sendMessage($link->chat_id, $text, $keyboard);
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }

    public function markAsRead(Notification $notification): void
    {
        $notification->update(['read_at' => now()]);
    }

    public function unreadCount(User $user): int
    {
        return Notification::where('user_id', $user->id)->unread()->count();
    }
}
