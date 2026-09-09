<?php

namespace App\Http\Middleware;

use App\Models\Subscription;
use App\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;

class CheckSubscription
{
    public function handle(Request $request, Closure $next)
    {
        $sub = Subscription::where('tenant_id', TenantContext::id())->first();

        if ($sub && $sub->isBlocked()) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json(['message' => 'Billing required: your subscription is inactive.'], 402);
            }

            return redirect()->route('billing');
        }

        return $next($request);
    }
}
