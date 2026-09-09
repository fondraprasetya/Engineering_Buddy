<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use Illuminate\Console\Command;

class ExpireTrials extends Command
{
    protected $signature = 'billing:expire-trials';

    protected $description = 'Flip trial subscriptions whose trial period has ended to past_due';

    public function handle(): int
    {
        $count = Subscription::where('status', 'trial')
            ->where('trial_ends_at', '<=', now())
            ->update(['status' => 'past_due']);

        $this->info("Expired {$count} trial subscription(s) to past_due.");

        return Command::SUCCESS;
    }
}
