<?php

namespace App\Http\Middleware;

use App\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;

class ResolveTenant
{
    public function handle(Request $request, Closure $next)
    {
        TenantContext::set($request->user()?->tenant_id);

        try {
            return $next($request);
        } finally {
            TenantContext::clear();
        }
    }
}
