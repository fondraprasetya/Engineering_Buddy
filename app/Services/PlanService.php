<?php

namespace App\Services;

class PlanService
{
    /**
     * Which feature keys each plan grants. '*' = all features.
     * 'trial' always grants everything (attract customers during the trial).
     */
    private const FEATURES = [
        'starter' => ['work-orders', 'calendar', 'assets', 'telegram', 'dashboard'],
        'professional' => ['work-orders', 'calendar', 'assets', 'telegram', 'dashboard', 'store', 'maintenance', 'roster', 'daily-logs', 'reports'],
        'enterprise' => ['*'],
    ];

    public static function allows(?string $plan, string $feature): bool
    {
        $plan = $plan ?: 'trial';
        if ($plan === 'trial') {
            return true;
        }
        $features = self::FEATURES[$plan] ?? [];

        return in_array('*', $features, true) || in_array($feature, $features, true);
    }

    public static function planNames(): array
    {
        return ['trial', 'starter', 'professional', 'enterprise'];
    }
}
