<?php

namespace App\Http\Controllers;

use App\Models\Location;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LocationController extends Controller
{
    public function index(Request $request)
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
                'floor_number' => $loc->floor_number,
                'is_event_venue' => (bool) $loc->is_event_venue,
                'description' => $loc->description,
                'parent_id' => $loc->parent_id,
                'children' => $buildTree($loc->id),
            ])->values()->all();
        };

        $tree = $buildTree(null);

        return Inertia::render('Locations/Index', ['tree' => $tree]);
    }

    public function create()
    {
        abort_unless(request()->user()->can('manage locations'), 403);

        return Inertia::render('Locations/Create', [
            'buildings' => Location::where('type', 'building')->select('id', 'name', 'code')->get(),
            'areas' => Location::where('type', 'area')->select('id', 'name', 'code')->get(),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->can('manage locations'), 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:building,area,room',
            'parent_id' => 'nullable|exists:locations,id',
            'description' => 'nullable|string|max:500',
            'floor_number' => 'nullable|string|max:50|required_if:type,room',
            'is_event_venue' => 'nullable|boolean',
        ]);

        $prefixes = ['building' => 'BLD', 'area' => 'AR', 'room' => 'RM'];
        // Derive the next code from existing codes (not max id, which collides
        // after deletes or across tenants since `code` is globally unique).
        $prefix = $prefixes[$validated['type']];
        $maxNum = Location::withoutGlobalScopes()
            ->where('type', $validated['type'])
            ->where('code', 'like', $prefix.'-%')
            ->get()
            ->map(fn ($l) => (int) substr($l->code, strlen($prefix) + 1))
            ->max() ?? 0;
        do {
            $maxNum++;
            $validated['code'] = $prefix.'-'.str_pad($maxNum, 3, '0', STR_PAD_LEFT);
        } while (Location::withoutGlobalScopes()->where('code', $validated['code'])->exists());

        Location::create($validated);

        return redirect('/locations')->with('success', 'Location created.');
    }

    public function edit(Location $location)
    {
        abort_unless(request()->user()->can('manage locations'), 403);

        $location->load('parent');

        return Inertia::render('Locations/Edit', [
            'location' => $location,
            'buildings' => Location::where('type', 'building')->where('id', '!=', $location->id)->select('id', 'name', 'code')->get(),
            'areas' => Location::where('type', 'area')->where('id', '!=', $location->id)->select('id', 'name', 'code')->get(),
        ]);
    }

    public function update(Request $request, Location $location)
    {
        abort_unless($request->user()->can('manage locations'), 403);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:building,area,room',
            'parent_id' => 'nullable|exists:locations,id',
            'description' => 'nullable|string|max:500',
            'floor_number' => 'nullable|string|max:50|required_if:type,room',
            'is_event_venue' => 'nullable|boolean',
        ]);

        $location->update($validated);

        return redirect('/locations')->with('success', 'Location updated.');
    }
}
