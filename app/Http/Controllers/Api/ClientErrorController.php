<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ClientErrorController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:500',
            'url' => 'nullable|string|max:500',
            'line' => 'nullable|integer|min:0',
            'column' => 'nullable|integer|min:0',
            'stack' => 'nullable|string|max:2000',
            'kind' => 'nullable|in:error,rejection',
        ]);

        Log::warning('[client] {message} @ {url}:{line}', [
            'message' => $validated['message'],
            'url' => $validated['url'] ?? '?',
            'line' => $validated['line'] ?? 0,
            'user_id' => $request->user()->id,
            'tenant_id' => $request->user()->tenant_id,
            'kind' => $validated['kind'] ?? 'error',
            'stack' => substr($validated['stack'] ?? '', 0, 1000),
        ]);

        return response()->noContent();
    }
}
