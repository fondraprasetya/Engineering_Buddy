<?php

namespace App\Http\Controllers;

use App\Models\Subscription;
use App\Models\Tenant;
use App\Services\MidtransService;
use App\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubscriptionsController extends Controller
{
    public function index(MidtransService $midtrans)
    {
        $subscription = Subscription::where('tenant_id', TenantContext::id())->first();

        return Inertia::render('Billing', [
            'subscription' => $subscription,
            'midtrans' => [
                'configured' => $midtrans->isConfigured(),
                'client_key' => $midtrans->clientKey(),
                'is_production' => $midtrans->isProduction(),
                'plans' => ['starter' => 350000, 'professional' => 850000, 'enterprise' => 2000000],
            ],
        ]);
    }

    public function checkout(Request $request, MidtransService $midtrans)
    {
        $plan = $request->validate(['plan' => ['required', 'in:starter,professional,enterprise']])['plan'];

        if (! $midtrans->isConfigured()) {
            return back()->withErrors(['plan' => 'Payment gateway is not configured yet.']);
        }

        $tenant = Tenant::find(TenantContext::id());
        $user = $request->user();

        $tx = $midtrans->createSnapTransaction(
            $tenant->id, $tenant->name, $user->name, $user->email, $plan,
        );

        if (! $tx) {
            return back()->withErrors(['plan' => 'Could not create Midtrans payment. Check keys and outbound access.']);
        }

        $subscription = Subscription::where('tenant_id', TenantContext::id())->first();

        return Inertia::render('Billing', [
            'subscription' => $subscription,
            'midtrans' => [
                'configured' => true,
                'client_key' => $midtrans->clientKey(),
                'is_production' => $midtrans->isProduction(),
                'plans' => ['starter' => 350000, 'professional' => 850000, 'enterprise' => 2000000],
            ],
            'snap_token' => $tx['token'],
            'snap_redirect' => $tx['redirect_url'],
        ]);
    }

    public function webhook(Request $request, MidtransService $midtrans)
    {
        $payload = $request->all();

        // Midtrans notification (signed with SHA512 signature_key)
        if (isset($payload['signature_key'])) {
            if (! $midtrans->verifyNotificationSignature($payload)) {
                return response()->json(['ok' => false], 401);
            }

            $tenantId = $midtrans->parseTenantId((string) ($payload['order_id'] ?? ''));
            $status = $midtrans->mapStatus($payload);

            if ($tenantId && $status) {
                $sub = Subscription::firstOrCreate(['tenant_id' => $tenantId], [
                    'plan' => 'professional',
                    'status' => 'trial',
                    'provider' => 'midtrans',
                ]);
                $sub->update([
                    'status' => $status,
                    'provider' => 'midtrans',
                    'provider_subscription_id' => $payload['order_id'] ?? null,
                    'amount' => $payload['gross_amount'] ?? $sub->amount,
                    'currency' => 'IDR',
                    'current_period_end' => $status === 'active' ? now()->addMonth() : $sub->current_period_end,
                ]);
            }

            return response()->json(['ok' => true]);
        }

        // Generic fallback (test/mock) — local development only. In production
        // unsigned payloads must never mutate billing state.
        if (! app()->isLocal()) {
            abort(404);
        }
        $type = $payload['type'] ?? null;
        $data = $payload['data'] ?? [];
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
