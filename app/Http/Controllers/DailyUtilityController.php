<?php

namespace App\Http\Controllers;

use App\Models\DailyUtility;
use App\Models\ImportLog;
use App\Models\UtilityRate;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class DailyUtilityController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $role = $user->getRoleNames()->first();

        $query = DailyUtility::with('recorder:id,name');

        if ($role === 'technician') {
            $query->where('recorded_by', $user->id);
        } elseif (! in_array($role, ['eng-admin', 'chief-engineer', 'gm', 'super-admin'])) {
            abort(403);
        }

        $defaultFrom = now()->startOfMonth()->toDateString();

        if ($request->type) {
            $query->where('type', $request->type);
        }
        if ($request->date_from) {
            $query->where('record_date', '>=', $request->date_from);
        } else {
            $query->where('record_date', '>=', $defaultFrom);
        }
        if ($request->date_to) {
            $query->where('record_date', '<=', $request->date_to);
        }

        $records = $query->latest('record_date')->paginate(20);

        $types = ['electricity', 'gas', 'water', 'waste', 'fuel'];

        $totalsQuery = DailyUtility::selectRaw('type, SUM(consumption) as total_consumption, SUM(cost) as total_cost')
            ->groupBy('type');

        if ($request->date_from) {
            $totalsQuery->where('record_date', '>=', $request->date_from);
        } else {
            $totalsQuery->where('record_date', '>=', $defaultFrom);
        }
        if ($request->date_to) {
            $totalsQuery->where('record_date', '<=', $request->date_to);
        }

        $totals = $totalsQuery->get()->keyBy('type');

        $filters = [
            'type' => $request->type ?? '',
            'date_from' => $request->date_from ?? $defaultFrom,
            'date_to' => $request->date_to ?? '',
        ];

        $importLogs = ImportLog::with('user:id,name')
            ->where('type', 'utility')
            ->latest()
            ->limit(20)
            ->get();

        return Inertia::render('Utilities/Index', [
            'records' => $records,
            'types' => $types,
            'totals' => $totals,
            'filters' => $filters,
        ]);
    }

    public function create()
    {
        $rates = UtilityRate::activeAt(today())
            ->get()
            ->groupBy('type')->map(fn ($group) => $group->first()->cost_per_unit);

        $previousStands = DailyUtility::selectRaw('type, MAX(ending_stand) as ending_stand')
            ->where('record_date', today()->subDay())
            ->groupBy('type')
            ->pluck('ending_stand', 'type');

        return Inertia::render('Utilities/Create', [
            'rates' => $rates,
            'previousStands' => $previousStands,
        ]);
    }

    public function previousStand(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:electricity,gas,water,waste,fuel',
            'date' => 'required|date',
        ]);

        $stand = DailyUtility::where('type', $validated['type'])
            ->where('record_date', '<', $validated['date'])
            ->orderByDesc('record_date')
            ->value('ending_stand');

        return response()->json(['ending_stand' => $stand]);
    }

    public function store(Request $request)
    {
        $isWaste = $request->type === 'waste';

        $validated = $request->validate([
            'record_date' => 'required|date',
            'type' => 'required|in:electricity,gas,water,waste,fuel',
            'beginning_stand' => $isWaste ? 'nullable' : 'required|numeric|min:0',
            'ending_stand' => $isWaste ? 'nullable' : 'required|numeric|min:0',
            'unit' => 'required|string|max:20',
            'cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $consumption = $isWaste
            ? (float) $request->input('waste_qty', 0)
            : $validated['ending_stand'] - $validated['beginning_stand'];

        if ($consumption < 0) {
            return back()->withErrors(['consumption' => 'Consumption cannot be negative.'])->withInput();
        }

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('utility-photos', 'public');
        }

        $validated['consumption'] = $consumption;

        if ($isWaste) {
            $validated['beginning_stand'] = null;
            $validated['ending_stand'] = null;
        }

        if (empty($validated['cost'])) {
            $rate = UtilityRate::activeAt($validated['record_date'])
                ->where('type', $validated['type'])
                ->value('cost_per_unit');
            if ($rate) {
                $validated['cost'] = round($consumption * (float) $rate, 2);
            }
        }

        $validated['recorded_by'] = $request->user()->id;

        DailyUtility::create($validated);

        return redirect('/utilities')->with('success', 'Utility record saved.');
    }

    public function edit(DailyUtility $dailyUtility)
    {
        $rates = UtilityRate::activeAt(today())
            ->get()
            ->groupBy('type')->map(fn ($group) => $group->first()->cost_per_unit);

        return Inertia::render('Utilities/Edit', [
            'record' => $dailyUtility->load('recorder:id,name'),
            'rates' => $rates,
        ]);
    }

    public function update(Request $request, DailyUtility $dailyUtility)
    {
        $isWaste = $request->type === 'waste';

        $validated = $request->validate([
            'record_date' => 'required|date',
            'type' => 'required|in:electricity,gas,water,waste,fuel',
            'beginning_stand' => $isWaste ? 'nullable' : 'required|numeric|min:0',
            'ending_stand' => $isWaste ? 'nullable' : 'required|numeric|min:0',
            'unit' => 'required|string|max:20',
            'cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $consumption = $isWaste
            ? (float) $request->input('waste_qty', 0)
            : $validated['ending_stand'] - $validated['beginning_stand'];

        if ($consumption < 0) {
            return back()->withErrors(['consumption' => 'Consumption cannot be negative.'])->withInput();
        }

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('utility-photos', 'public');
        }

        $validated['consumption'] = $consumption;

        if ($isWaste) {
            $validated['beginning_stand'] = null;
            $validated['ending_stand'] = null;
        }

        if (empty($validated['cost'])) {
            $rate = UtilityRate::activeAt($validated['record_date'])
                ->where('type', $validated['type'])
                ->value('cost_per_unit');
            if ($rate) {
                $validated['cost'] = round($consumption * (float) $rate, 2);
            }
        }

        $dailyUtility->update($validated);

        return redirect('/utilities')->with('success', 'Utility record updated.');
    }

    public function export(Request $request)
    {
        $user = $request->user();
        $role = $user->getRoleNames()->first();

        if (! in_array($role, ['eng-admin', 'chief-engineer', 'gm', 'super-admin'])) {
            abort(403);
        }

        $query = DailyUtility::query();
        $defaultFrom = now()->startOfMonth()->toDateString();

        if ($request->type) {
            $query->where('type', $request->type);
        }
        if ($request->date_from) {
            $query->where('record_date', '>=', $request->date_from);
        } else {
            $query->where('record_date', '>=', $defaultFrom);
        }
        if ($request->date_to) {
            $query->where('record_date', '<=', $request->date_to);
        }

        $records = $query->orderBy('record_date')->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="utilities-export.csv"',
        ];

        $callback = function () use ($records) {
            $previous = setlocale(LC_NUMERIC, '0');
            setlocale(LC_NUMERIC, 'C');

            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Type', 'Record Date', 'Beginning Stand', 'Ending Stand', 'Consumption', 'Unit', 'Cost', 'Notes']);

            foreach ($records as $r) {
                fputcsv($handle, [
                    $r->type,
                    $r->record_date?->format('d-m-y'),
                    $r->beginning_stand,
                    $r->ending_stand,
                    $r->consumption,
                    $r->unit,
                    $r->cost,
                    $r->notes,
                ]);
            }

            setlocale(LC_NUMERIC, $previous);

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function import(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048',
        ]);

        $userId = $request->user()->id;
        $fileName = $validated['file']->getClientOriginalName();

        Log::info('DailyUtility import started', ['user_id' => $userId, 'file' => $fileName]);

        $handle = fopen($validated['file']->getRealPath(), 'r');
        $header = fgetcsv($handle);

        $expected = ['Type', 'Record Date', 'Beginning Stand', 'Ending Stand', 'Consumption', 'Unit', 'Cost', 'Notes'];
        $normalized = array_map('trim', $header ?? []);
        if ($normalized !== $expected) {
            fclose($handle);
            Log::warning('DailyUtility import aborted — invalid headers', ['user_id' => $userId, 'file' => $fileName, 'got' => $normalized]);
            ImportLog::create([
                'user_id' => $userId,
                'file_name' => $fileName,
                'type' => 'utility',
                'status' => 'failed',
                'error_message' => 'CSV headers do not match expected format.',
            ]);

            return back()->withErrors(['file' => 'CSV headers must match: '.implode(', ', $expected)]);
        }

        $imported = 0;
        $errors = [];
        $row = 2;

        DB::beginTransaction();
        try {
            while (($line = fgetcsv($handle)) !== false) {
                $line = array_map('trim', $line);
                $rawDate = $line[1];

                $recordDate = null;
                foreach (['d-m-y', 'd-m-Y', 'Y-m-d', 'd/m/y', 'd/m/Y', 'Y/m/d', 'm-d-y', 'm-d-Y', 'm/d/y', 'm/d/Y'] as $fmt) {
                    try {
                        $parsed = Carbon::createFromFormat($fmt, $rawDate);
                        if ($parsed && $parsed->format($fmt) === $rawDate) {
                            $recordDate = $parsed->startOfDay();
                            break;
                        }
                    } catch (\Exception $e) {
                    }
                }

                if ($recordDate === null) {
                    $errors[] = "Row {$row}: Invalid date format '{$rawDate}'";
                    Log::info('DailyUtility import row skipped', ['user_id' => $userId, 'file' => $fileName, 'row' => $row, 'reason' => 'invalid_date', 'value' => $rawDate]);
                    $row++;

                    continue;
                }

                $data = [
                    'type' => $line[0],
                    'record_date' => $recordDate,
                    'beginning_stand' => $line[2] !== '' ? $line[2] : null,
                    'ending_stand' => $line[3] !== '' ? $line[3] : null,
                    'consumption' => $line[4],
                    'unit' => $line[5],
                    'cost' => $line[6] !== '' ? $line[6] : null,
                    'notes' => $line[7] !== '' ? $line[7] : null,
                    'recorded_by' => $userId,
                ];

                if ($data['beginning_stand'] !== null && $data['ending_stand'] !== null) {
                    $calculated = (float) $data['ending_stand'] - (float) $data['beginning_stand'];
                    if ($calculated < 0) {
                        $errors[] = "Row {$row}: Ending stand < beginning stand";
                        Log::info('DailyUtility import row skipped', ['user_id' => $userId, 'file' => $fileName, 'row' => $row, 'record_date' => $recordDate, 'reason' => 'negative_consumption']);
                        $row++;

                        continue;
                    }
                    $data['consumption'] = $calculated;
                }

                DailyUtility::create($data);
                Log::debug('DailyUtility import row inserted', ['user_id' => $userId, 'file' => $fileName, 'row' => $row, 'record_date' => $recordDate, 'type' => $data['type']]);
                $imported++;
                $row++;
            }
            DB::commit();
            Log::info('DailyUtility import committed', ['user_id' => $userId, 'file' => $fileName, 'imported' => $imported, 'skipped' => count($errors)]);
            ImportLog::create([
                'user_id' => $userId,
                'file_name' => $fileName,
                'type' => 'utility',
                'status' => 'success',
                'imported' => $imported,
                'skipped' => count($errors),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            fclose($handle);
            Log::error('DailyUtility import failed — rolled back', ['user_id' => $userId, 'file' => $fileName, 'error' => $e->getMessage()]);
            ImportLog::create([
                'user_id' => $userId,
                'file_name' => $fileName,
                'type' => 'utility',
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            return back()->withErrors(['file' => 'Import failed: '.$e->getMessage()]);
        }

        fclose($handle);

        $message = "{$imported} record(s) imported successfully.";
        if ($errors) {
            $message .= ' '.count($errors).' row(s) skipped: '.implode('; ', $errors);
        }

        return redirect('/utilities')->with('success', $message);
    }
}
