<?php

namespace App\Http\Controllers;

use App\Models\Subscription;
use App\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubscriptionsController extends Controller
{
    public function index()
    {
        $subscription = Subscription::where('tenant_id', TenantContext::id())->first();

        return Inertia::render('Billing', ['subscription' => $subscription]);
    }

    /**
     * Payment provider webhook (provider-agnostic shape).
     * Expected JSON: { "type": "payment.success|payment.failed|subscription.canceled",
     *                  "data": { "tenant_id":.., "plan":.., "amount":.., "currency":..,
     *                            "provider_subscription_id":.., "current_period_end":.. } }
     */
    public function webhook(Request $request)
    {
        $type = $request->input('type');
        $data = $request->input('data', []);
        $tenantId = $data['tenant_id'] ?? null;

        $status = match ($type) {
            'payment.success' => 'active',
            'payment.failed' => 'past_due',
            'subscription.canceled' => 'canceled',
            default => null,
        };

        if ($tenantId && $status) {
            $sub = Subscription::firstOrCreate(['tenant_id' => $tenantId], [
                'plan' => $data['plan'] ?? 'professional',
                'status' => 'trial',
                'provider' => 'mock',
            ]);
            $sub->update([
                'status' => $status,
                'provider' => $data['provider'] ?? ($sub->provider ?? 'mock'),
                'provider_customer_id' => $data['provider_customer_id'] ?? $sub->provider_customer_id,
                'provider_subscription_id' => $data['provider_subscription_id'] ?? $sub->provider_subscription_id,
                'amount' => $data['amount'] ?? $sub->amount,
                'currency' => $data['currency'] ?? $sub->currency,
                'current_period_end' => $data['current_period_end'] ?? $sub->current_period_end,
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
