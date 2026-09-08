<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DashboardSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardSettingsController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user(), 401);

        $validated = $request->validate([
            'layout' => 'nullable|array',
            'layout.*.key' => 'required|string',
            'layout.*.width' => 'required|string',
            'layout.*.order' => 'required|integer',
            'hidden' => 'nullable|array',
            'hidden.*' => 'string',
        ]);

        $settings = DashboardSetting::updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'layout' => $validated['layout'] ?? null,
                'hidden' => $validated['hidden'] ?? [],
            ]
        );

        return response()->json($settings);
    }
}
