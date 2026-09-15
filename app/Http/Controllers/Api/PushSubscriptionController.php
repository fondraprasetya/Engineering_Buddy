<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    public function publicKey()
    {
        return response()->json(['publicKey' => config('services.vapid.public_key')]);
    }

    public function subscribe(Request $request)
    {
        $validated = $request->validate([
            'endpoint' => 'required|string|max:2000',
            'keys.p256dh' => 'required|string|max:255',
            'keys.auth' => 'required|string|max:255',
            'user_agent' => 'nullable|string|max:500',
        ]);

        $sub = PushSubscription::updateOrCreate(
            ['user_id' => $request->user()->id, 'endpoint' => hash('sha256', $validated['endpoint'])],
            [
                'tenant_id' => $request->user()->tenant_id,
                'endpoint' => $validated['endpoint'],
                'p256dh' => $validated['keys']['p256dh'],
                'auth' => $validated['keys']['auth'],
                'user_agent' => $validated['user_agent'] ?? substr($request->userAgent() ?? '', 0, 500),
            ],
        );

        return response()->json(['id' => $sub->id], 201);
    }

    public function unsubscribe(Request $request)
    {
        $validated = $request->validate(['endpoint' => 'required|string|max:2000']);

        PushSubscription::where('user_id', $request->user()->id)
            ->where('endpoint', hash('sha256', $validated['endpoint']))
            ->delete();

        return response()->noContent();
    }
}
