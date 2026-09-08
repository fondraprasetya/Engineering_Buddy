<?php

namespace App\Http\Controllers;

use App\Models\UtilityRate;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UtilityRateController extends Controller
{
    public function index()
    {
        $rates = UtilityRate::orderBy('type')->get();

        return Inertia::render('UtilityRates/Index', [
            'rates' => $rates,
        ]);
    }

    public function create()
    {
        return Inertia::render('UtilityRates/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:electricity,gas,water,waste,fuel',
            'cost_per_unit' => 'required|numeric|min:0',
            'unit' => 'required|string|max:20',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'notes' => 'nullable|string|max:500',
        ]);

        UtilityRate::create($validated);

        return redirect('/utility-rates')->with('success', 'Utility rate created.');
    }

    public function edit(UtilityRate $utilityRate)
    {
        $rate = $utilityRate->toArray();
        $rate['start_date'] = $utilityRate->start_date?->format('Y-m-d');
        $rate['end_date'] = $utilityRate->end_date?->format('Y-m-d');

        return Inertia::render('UtilityRates/Edit', [
            'rate' => $rate,
        ]);
    }

    public function update(Request $request, UtilityRate $utilityRate)
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

        return redirect('/utility-rates')->with('success', 'Utility rate updated.');
    }

    public function destroy(UtilityRate $utilityRate)
    {
        $utilityRate->delete();

        return redirect('/utility-rates')->with('success', 'Utility rate deleted.');
    }
}
