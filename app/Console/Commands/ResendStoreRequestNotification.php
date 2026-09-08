<?php

namespace App\Console\Commands;

use App\Models\StoreRequest;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('telegram:resend-store-request {id : Store request ID}')]
#[Description('Resend Telegram notification for a store request')]
class ResendStoreRequestNotification extends Command
{
    public function handle(): int
    {
        $id = (int) $this->argument('id');
        $request = StoreRequest::with(['item', 'requester', 'approver'])->find($id);

        if (! $request) {
            $this->error("Store request #{$id} not found.");

            return self::FAILURE;
        }

        $notif = app(NotificationService::class);

        match ($request->status) {
            'pending' => $this->sendPending($notif, $request),
            'approved' => $this->sendApproved($notif, $request),
            'fulfilled' => $this->sendFulfilled($notif, $request),
            'rejected' => $this->sendRejected($notif, $request),
            default => $this->warn("Unknown status: {$request->status}"),
        };

        return self::SUCCESS;
    }

    private function sendPending(NotificationService $notif, StoreRequest $request): void
    {
        $itemName = $request->item?->name ?? 'Unknown';
        $userName = $request->requester?->name ?? 'Unknown';

        User::role('chief-engineer')->each(fn ($ce) => $notif->send($ce, 'store_request_submitted', [
            'request_id' => $request->id,
            'item_name' => $itemName,
            'qty' => $request->qty_requested,
            'requested_by' => $userName,
        ]));

        $this->info("Sent pending notification for request #{$request->id} to chief-engineers.");
    }

    private function sendApproved(NotificationService $notif, StoreRequest $request): void
    {
        if (! $request->requester) {
            $this->warn("Request #{$request->id} has no requester.");

            return;
        }

        $notif->send($request->requester, 'store_request_approved', [
            'request_id' => $request->id,
            'item_name' => $request->item?->name ?? 'Unknown',
            'qty' => $request->qty_requested,
            'qty_approved' => $request->qty_approved,
            'approved_by' => $request->approver?->name ?? 'Unknown',
        ]);

        $this->info("Sent approved notification for request #{$request->id} to {$request->requester->name}.");
    }

    private function sendFulfilled(NotificationService $notif, StoreRequest $request): void
    {
        if (! $request->requester) {
            $this->warn("Request #{$request->id} has no requester.");

            return;
        }

        $notif->send($request->requester, 'store_request_fulfilled', [
            'request_id' => $request->id,
            'item_name' => $request->item?->name ?? 'Unknown',
            'qty' => $request->qty_approved ?? $request->qty_requested,
            'fulfilled_by' => $request->approver?->name ?? 'System',
        ]);

        $this->info("Sent fulfilled notification for request #{$request->id} to {$request->requester->name}.");
    }

    private function sendRejected(NotificationService $notif, StoreRequest $request): void
    {
        if (! $request->requester) {
            $this->warn("Request #{$request->id} has no requester.");

            return;
        }

        $notif->send($request->requester, 'store_request_rejected', [
            'request_id' => $request->id,
            'item_name' => $request->item?->name ?? 'Unknown',
            'qty' => $request->qty_requested,
            'rejected_by' => $request->approver?->name ?? 'Unknown',
        ]);

        $this->info("Sent rejected notification for request #{$request->id} to {$request->requester->name}.");
    }
}
