<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\Location;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetController extends Controller
{
    private function locationOptions(): array
    {
        $all = Location::orderBy('name')->get();
        $grouped = $all->groupBy('parent_id');
        $options = [];

        $walk = function ($parentId, $depth) use (&$walk, $grouped, &$options) {
            foreach ($grouped[$parentId] ?? [] as $loc) {
                $prefix = str_repeat('─ ', $depth);
                $label = $depth > 0 ? $prefix.$loc->name : $loc->name;
                if ($loc->code) {
                    $label .= " ({$loc->code})";
                }
                $options[] = ['id' => $loc->id, 'label' => $label, 'type' => $loc->type];
                $walk($loc->id, $depth + 1);
            }
        };

        $walk(null, 0);

        return $options;
    }

    public function index(Request $request)
    {
        abort_unless($request->user()->can('manage assets'), 403);

        $assets = Asset::with('location:id,name,code')
            ->when($request->search, fn ($q, $v) => $q->where('name', 'like', "%{$v}%")->orWhere('code', 'like', "%{$v}%"))
            ->latest()
            ->paginate(20);

        return Inertia::render('Assets/Index', ['assets' => $assets]);
    }

    public function create()
    {
        return Inertia::render('Assets/Create', [
            'locationOptions' => $this->locationOptions(),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->can('manage assets'), 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|in:Furniture,Electronic,Mechanical,Equipment,Vehicle,HVAC,Building',
            'location_id' => 'nullable|exists:locations,id',
            'status' => 'sometimes|string|in:active,inactive,under_maintenance',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'acquisition_cost' => 'nullable|numeric|min:0',
            'acquisition_date' => 'nullable|date',
        ]);

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('photos', 'public');
        }

        $last = Asset::max('id') ?? 0;
        $validated['code'] = 'AST-'.str_pad($last + 1, 3, '0', STR_PAD_LEFT);

        Asset::create($validated);

        return redirect('/assets')->with('success', 'Asset created.');
    }

    public function show(Asset $asset)
    {
        $asset->load([
            'location:id,name,code',
            'workOrders' => fn ($q) => $q->latest()->with(['requester:id,name', 'approvals.approver:id,name']),
            'maintenanceSchedules',
        ]);

        return Inertia::render('Assets/Show', ['asset' => $asset]);
    }

    public function edit(Asset $asset)
    {
        return Inertia::render('Assets/Edit', [
            'asset' => $asset->load('location:id,name'),
            'locationOptions' => $this->locationOptions(),
        ]);
    }

    public function update(Request $request, Asset $asset)
    {
        abort_unless($request->user()->can('manage assets'), 403);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'sometimes|in:Furniture,Electronic,Mechanical,Equipment,Vehicle,HVAC,Building',
            'location_id' => 'nullable|exists:locations,id',
            'status' => 'sometimes|string|in:active,inactive,under_maintenance',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'acquisition_cost' => 'nullable|numeric|min:0',
            'acquisition_date' => 'nullable|date',
        ]);

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('photos', 'public');
        }

        $asset->update($validated);

        return redirect('/assets')->with('success', 'Asset updated.');
    }

    public function qrcode(Asset $asset)
    {
        $url = route('assets.history', $asset);

        $renderer = new ImageRenderer(
            new RendererStyle(300),
            new SvgImageBackEnd
        );

        $writer = new Writer($renderer);
        $svg = $writer->writeString($url);

        return response($svg, 200, ['Content-Type' => 'image/svg+xml']);
    }

    public function history(Asset $asset)
    {
        abort_unless(auth()->user()->can('view asset history'), 403);

        $asset->load([
            'workOrders' => fn ($q) => $q->with(['requester:id,name', 'approvals.approver:id,name', 'checklistResponses.field', 'expenses'])->latest(),
            'maintenanceSchedules',
            'projects' => fn ($q) => $q->with('creator:id,name')->latest(),
        ]);

        $dailyLogs = $asset->workOrders()
            ->with('dailyLogs.technician:id,name')
            ->get()
            ->pluck('dailyLogs')
            ->flatten()
            ->sortByDesc('log_date')
            ->values();

        return Inertia::render('Assets/History', [
            'asset' => $asset->only(['id', 'name', 'code', 'category', 'status']),
            'workOrders' => $asset->workOrders,
            'maintenanceSchedules' => $asset->maintenanceSchedules,
            'dailyLogs' => $dailyLogs,
            'projects' => $asset->projects,
        ]);
    }
}
