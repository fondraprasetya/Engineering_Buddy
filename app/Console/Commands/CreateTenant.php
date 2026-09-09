<?php

namespace App\Console\Commands;

use App\Services\ProvisionTenant;
use Illuminate\Console\Command;

class CreateTenant extends Command
{
    protected $signature = 'tenant:create
        {name : Tenant / company name}
        {--owner= : Owner/admin email (required)}
        {--owner-name= : Owner display name}
        {--password= : Admin password (random if omitted)}
        {--plan=trial : Plan (trial|starter|professional|enterprise)}';

    protected $description = 'Provision a new tenant with an admin user and default departments';

    public function handle(ProvisionTenant $provision): int
    {
        $email = $this->option('owner');
        if (! $email) {
            $this->error('--owner email is required');

            return Command::FAILURE;
        }

        [$tenant, $user] = $provision->provision(
            name: $this->argument('name'),
            ownerEmail: $email,
            ownerName: $this->option('owner-name'),
            password: $this->option('password'),
            plan: $this->option('plan'),
        );

        $this->info("Tenant #{$tenant->id}: {$tenant->name} (slug {$tenant->slug}, plan {$tenant->plan})");
        $this->info("Admin: {$user->email}  (role super-admin)");

        return Command::SUCCESS;
    }
}
