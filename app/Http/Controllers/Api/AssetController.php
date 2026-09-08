<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage assets'), 403);

        return response()->json(
            Asset::with('location:id,name,code')
                ->latest()
                ->paginate(20)
        );
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage assets'), 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|in:Furniture,Electronic,Mechanical,Equipment,Vehicle,HVAC,Building',
            'location_id' => 'nullable|exists:locations,id',
            'status' => 'sometimes|string|in:active,inactive,under_maintenance',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('photos', 'public');
        }

        $last = Asset::max('id') ?? 0;
        $validated['code'] = 'AST-'.str_pad($last + 1, 3, '0', STR_PAD_LEFT);

        return response()->json(Asset::create($validated)->load('location:id,name'), 201);
    }

    public function show(Asset $asset): JsonResponse
    {
        return response()->json(
            $asset->load([
                'location:id,name,code',
                'workOrders' => fn ($q) => $q->latest()->limit(10),
                'workOrders.requester:id,name',
                'maintenanceSchedules',
            ])
        );
    }

    public function update(Request $request, Asset $asset): JsonResponse
    {
        abort_unless($request->user()->can('manage assets'), 403);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'sometimes|in:Furniture,Electronic,Mechanical,Equipment,Vehicle,HVAC,Building',
            'location_id' => 'nullable|exists:locations,id',
            'status' => 'sometimes|string|in:active,inactive,under_maintenance',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('photos', 'public');
        }

        $asset->update($validated);

        return response()->json($asset->fresh()->load('location:id,name'));
    }

    public function history(Asset $asset): JsonResponse
    {
        $asset->load([
            'workOrders' => fn ($q) => $q->with(['requester:id,name', 'approvals.approver:id,name'])->latest(),
            'maintenanceSchedules',
        ]);

        return response()->json($asset);
    }
}
