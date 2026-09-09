<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProvisionTenant
{
    public function provision(
        string $name,
        string $ownerEmail,
        ?string $ownerName = null,
        ?string $password = null,
        string $plan = 'trial',
        ?string $slug = null,
    ): array {
        $slug = $this->uniqueSlug($slug ?: Str::slug($name));

        return DB::transaction(function () use ($name, $slug, $ownerEmail, $ownerName, $password, $plan) {
            $tenant = Tenant::create([
                'name' => $name,
                'slug' => $slug,
                'plan' => $plan,
                'status' => 'trial',
            ]);

            // Scope all child creates to this tenant via the BelongsToTenant trait
            TenantContext::set($tenant->id);

            $user = User::create([
                'name' => $ownerName ?: (ucfirst(strstr($ownerEmail, '@', true) ?: 'Facility Admin')),
                'email' => $ownerEmail,
                'password' => ($password ?: Str::random(16)),   // hashed via cast
                'is_active' => true,
            ]);
            $user->assignRole('super-admin');

            foreach (['Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering'] as $d) {
                Department::create(['name' => $d]);
            }

            TenantContext::clear();

            Subscription::create([
                'tenant_id' => $tenant->id,
                'plan' => 'trial',
                'status' => 'trial',
                'provider' => 'mock',
                'trial_ends_at' => now()->addDays(14),
            ]);

            return [$tenant, $user];
        });
    }

    private function uniqueSlug(string $slug): string
    {
        $base = $slug;
        while (Tenant::where('slug', $slug)->exists()) {
            $slug = $base.'-'.strtolower(Str::random(4));
        }

        return $slug;
    }
}
