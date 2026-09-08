<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Location;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage locations'), 403);

        $all = Location::orderBy('name')->get();

        $grouped = $all->groupBy('parent_id');

        $buildTree = function ($parentId) use (&$buildTree, $grouped) {
            return ($grouped[$parentId] ?? collect())->map(fn ($loc) => [
                'id' => $loc->id,
                'name' => $loc->name,
                'type' => $loc->type,
                'code' => $loc->code,
                'description' => $loc->description,
                'parent_id' => $loc->parent_id,
                'children' => $buildTree($loc->id),
            ])->values()->all();
        };

        return response()->json($buildTree(null));
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage locations'), 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:building,area,room',
            'parent_id' => 'nullable|exists:locations,id',
            'description' => 'nullable|string|max:500',
            'floor_number' => 'nullable|string|max:50|required_if:type,room',
        ]);

        $prefixes = ['building' => 'BLD', 'area' => 'AR', 'room' => 'RM'];
        $last = Location::where('type', $validated['type'])->max('id') ?? 0;
        $validated['code'] = $prefixes[$validated['type']].'-'.str_pad($last + 1, 3, '0', STR_PAD_LEFT);

        $location = Location::create($validated);

        return response()->json($location->load('parent'), 201);
    }

    public function show(Location $location): JsonResponse
    {
        abort_unless(request()->user()->can('manage locations'), 403);

        return response()->json($location->load('parent'));
    }

    public function update(Request $request, Location $location): JsonResponse
    {
        abort_unless($request->user()->can('manage locations'), 403);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:building,area,room',
            'parent_id' => 'nullable|exists:locations,id',
            'description' => 'nullable|string|max:500',
            'floor_number' => 'nullable|string|max:50|required_if:type,room',
        ]);

        $location->update($validated);

        return response()->json($location->fresh()->load('parent'));
    }
}
