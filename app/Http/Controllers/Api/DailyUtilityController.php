<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyUtility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyUtilityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $user->getRoleNames()->first();

        $query = DailyUtility::with('recorder:id,name');

        if ($role === 'technician') {
            $query->where('recorded_by', $user->id);
        } elseif (! in_array($role, ['eng-admin', 'chief-engineer', 'gm', 'super-admin'])) {
            abort(403);
        }

        if ($request->type) {
            $query->where('type', $request->type);
        }

        if ($request->date_from) {
            $query->where('record_date', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->where('record_date', '<=', $request->date_to);
        }

        return response()->json($query->latest('record_date')->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'record_date' => 'required|date',
            'type' => 'required|in:electricity,gas,water,waste,fuel',
            'beginning_stand' => 'required|numeric|min:0',
            'ending_stand' => 'required|numeric|min:0',
            'unit' => 'required|string|max:20',
            'cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $consumption = $validated['ending_stand'] - $validated['beginning_stand'];

        if ($consumption < 0) {
            return response()->json(['message' => 'Ending stand must be greater than or equal to beginning stand.', 'errors' => ['ending_stand' => ['Ending stand must be greater than or equal to beginning stand.']]], 422);
        }

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('utility-photos', 'public');
        }

        $utility = DailyUtility::create([
            ...$validated,
            'consumption' => $consumption,
            'recorded_by' => $request->user()->id,
        ]);

        return response()->json($utility->load('recorder:id,name'), 201);
    }

    public function update(Request $request, DailyUtility $dailyUtility): JsonResponse
    {
        $validated = $request->validate([
            'record_date' => 'required|date',
            'type' => 'required|in:electricity,gas,water,waste,fuel',
            'beginning_stand' => 'required|numeric|min:0',
            'ending_stand' => 'required|numeric|min:0',
            'unit' => 'required|string|max:20',
            'cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $consumption = $validated['ending_stand'] - $validated['beginning_stand'];

        if ($consumption < 0) {
            return response()->json(['message' => 'Ending stand must be greater than or equal to beginning stand.', 'errors' => ['ending_stand' => ['Ending stand must be greater than or equal to beginning stand.']]], 422);
        }

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('utility-photos', 'public');
        }

        $dailyUtility->update([
            ...$validated,
            'consumption' => $consumption,
        ]);

        return response()->json($dailyUtility->fresh()->load('recorder:id,name'));
    }
}
