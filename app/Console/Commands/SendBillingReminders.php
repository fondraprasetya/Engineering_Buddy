<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendBillingReminders extends Command
{
    protected $signature = 'billing:send-reminders';

    protected $description = 'Send friendly upgrade/resume reminders for trials ending soon and inactive subscriptions';

    public function handle(NotificationService $notifications): int
    {
        $sent = 0;

        // Trials ending within the next 3 days
        Subscription::where('status', 'trial')
            ->where('trial_ends_at', '>', now())
            ->where('trial_ends_at', '<=', now()->addDays(3))
            ->get()
            ->each(function (Subscription $sub) use ($notifications, &$sent) {
                if (! $this->shouldRemind($sub)) {
                    return;
                }
                $user = User::where('tenant_id', $sub->tenant_id)->orderBy('id')->first();
                if (! $user) {
                    return;
                }
                $days = max(1, (int) ceil(now()->diffInDays($sub->trial_ends_at)));
                $notifications->send($user, 'billing_trial_ending', ['days' => $days]);
                $sub->update(['reminder_sent_at' => now()]);
                $sent++;
            });

        // Inactive subscriptions (needs to resume/upgrade)
        Subscription::where('status', 'past_due')
            ->get()
            ->each(function (Subscription $sub) use ($notifications, &$sent) {
                if (! $this->shouldRemind($sub)) {
                    return;
                }
                $user = User::where('tenant_id', $sub->tenant_id)->orderBy('id')->first();
                if (! $user) {
                    return;
                }
                $notifications->send($user, 'billing_past_due', []);
                $sub->update(['reminder_sent_at' => now()]);
                $sent++;
            });

        $this->info("Sent {$sent} billing reminder(s).");

        return Command::SUCCESS;
    }

    private function shouldRemind(Subscription $sub): bool
    {
        return ! $sub->reminder_sent_at || $sub->reminder_sent_at->lt(now()->subDay());
    }
}
