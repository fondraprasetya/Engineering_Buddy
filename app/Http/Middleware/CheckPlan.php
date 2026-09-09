<?php

namespace App\Http\Middleware;

use App\Models\Subscription;
use App\Services\PlanService;
use App\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;

class CheckPlan
{
    public function handle(Request $request, Closure $next, string $feature)
    {
        $sub = Subscription::where('tenant_id', TenantContext::id())->first();

        if (! PlanService::allows($sub?->plan, $feature)) {
            abort(403, 'This feature requires a higher subscription plan.');
        }

        return $next($request);
    }
}
