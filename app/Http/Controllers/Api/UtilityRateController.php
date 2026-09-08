<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UtilityRate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UtilityRateController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(UtilityRate::orderBy('type')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:electricity,gas,water,waste,fuel',
            'cost_per_unit' => 'required|numeric|min:0',
            'unit' => 'required|string|max:20',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'notes' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ]);

        $rate = UtilityRate::create($validated);

        return response()->json($rate, 201);
    }

    public function show(UtilityRate $utilityRate): JsonResponse
    {
        return response()->json($utilityRate);
    }

    public function update(Request $request, UtilityRate $utilityRate): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'sometimes|in:electricity,gas,water,waste,fuel',
            'cost_per_unit' => 'sometimes|numeric|min:0',
            'unit' => 'sometimes|string|max:20',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'notes' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ]);

        $utilityRate->update($validated);

        return response()->json($utilityRate);
    }

    public function destroy(UtilityRate $utilityRate): JsonResponse
    {
        $utilityRate->delete();

        return response()->json(null, 204);
    }
}
