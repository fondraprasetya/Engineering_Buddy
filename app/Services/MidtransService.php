<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class MidtransService
{
    private ?string $serverKey;
    private bool $isProduction;

    private const PLAN_PRICES = [
        'starter' => 350000,
        'professional' => 850000,
        'enterprise' => 2000000,
    ];

    public function __construct()
    {
        $this->serverKey = config('services.midtrans.server_key');
        $this->isProduction = (bool) config('services.midtrans.is_production');
    }

    public function isConfigured(): bool
    {
        return ! empty($this->serverKey);
    }

    public function isProduction(): bool
    {
        return $this->isProduction;
    }

    public function clientKey(): ?string
    {
        return config('services.midtrans.client_key');
    }

    public function planPrice(string $plan): int
    {
        return self::PLAN_PRICES[$plan] ?? 0;
    }

    public function createSnapTransaction(
        int $tenantId,
        string $tenantName,
        string $customerName,
        string $email,
        string $plan,
    ): ?array {
        if (! $this->isConfigured()) {
            return null;
        }

        $amount = $this->planPrice($plan);
        $orderId = 'SUB-'.$tenantId.'-'.strtoupper($plan).'-'.strtoupper(Str::random(6));

        $payload = [
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => $amount,
            ],
            'item_details' => [[
                'id' => $plan,
                'price' => $amount,
                'quantity' => 1,
                'name' => 'Engineering Buddy '.ucfirst($plan).' plan (monthly)',
            ]],
            'customer_details' => [
                'first_name' => $customerName ?: $tenantName,
                'email' => $email,
                'billing_address' => ['address' => ''],
            ],
        ];

        $resp = Http::withBasicAuth($this->serverKey, '')
            ->acceptJson()
            ->post(config('services.midtrans.snap_url'), $payload);

        if (! $resp->successful()) {
            return null;
        }

        $data = $resp->json();

        return [
            'order_id' => $orderId,
            'token' => $data['token'] ?? null,
            'redirect_url' => $data['redirect_url'] ?? null,
        ];
    }

    /** Midtrans signature = SHA512(order_id + status_code + gross_amount + server_key) */
    public function verifyNotificationSignature(array $payload): bool
    {
        if (! $this->serverKey) {
            return false;
        }

        $expected = hash('sha512',
            ($payload['order_id'] ?? '').
            ($payload['status_code'] ?? '').
            ($payload['gross_amount'] ?? '').
            $this->serverKey);

        return hash_equals($expected, (string) ($payload['signature_key'] ?? ''));
    }

    public function mapStatus(array $payload): ?string
    {
        return match ($payload['transaction_status'] ?? '') {
            'capture', 'settlement' => 'active',
            'pending' => 'trial',
            'failure', 'deny', 'expire', 'cancel', 'refund', 'partial_refund' => 'past_due',
            default => null,
        };
    }

    public function parseTenantId(string $orderId): ?int
    {
        if (str_starts_with($orderId, 'SUB-')) {
            return (int) (explode('-', $orderId)[1] ?? 0);
        }

        return null;
    }
}
