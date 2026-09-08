<?php

namespace App\Http\Controllers;

use App\Models\ImportLog;
use App\Models\MonthlyBudget;
use App\Models\PostAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class MonthlyBudgetController extends Controller
{
    public function index(Request $request)
    {
        $year = $request->year ?? now()->year;

        $budgets = MonthlyBudget::where('year', $year)->get();
        $masterAccounts = PostAccount::orderBy('code')->get(['code', 'name']);

        $budgetByAccount = [];
        $nullAccountMonths = [];
        for ($m = 1; $m <= 12; $m++) {
            $nullAccountMonths[$m] = 0;
        }

        foreach ($budgets as $b) {
            $code = $b->post_account;
            if ($code === null) {
                $nullAccountMonths[$b->month] += (float) $b->amount;

                continue;
            }
            if (! isset($budgetByAccount[$code])) {
                $budgetByAccount[$code] = array_fill(1, 12, 0);
            }
            $budgetByAccount[$code][$b->month] += (float) $b->amount;
        }

        $rows = [];

        foreach ($masterAccounts as $a) {
            $code = $a->code;
            $months = $budgetByAccount[$code] ?? array_fill(1, 12, 0);
            $rowTotal = array_sum($months);
            $rows[] = [
                'code' => $code,
                'name' => $a->name,
                'months' => array_values($months),
                'total' => $rowTotal,
            ];
            unset($budgetByAccount[$code]);
        }

        foreach ($budgetByAccount as $code => $months) {
            $rowTotal = array_sum($months);
            $rows[] = [
                'code' => $code,
                'name' => '',
                'months' => array_values($months),
                'total' => $rowTotal,
            ];
        }

        $noAccountMonths = array_values($nullAccountMonths);
        $noAccountTotal = array_sum($noAccountMonths);

        $totals = [];
        for ($m = 0; $m < 12; $m++) {
            $t = $noAccountMonths[$m] ?? 0;
            foreach ($rows as $r) {
                $t += $r['months'][$m];
            }
            $totals[] = $t;
        }
        $grandTotal = array_sum($totals);

        $importLogs = ImportLog::with('user:id,name')
            ->where('type', 'budget')
            ->latest()
            ->limit(20)
            ->get();

        return Inertia::render('Budgets/Index', [
            'rows' => $rows,
            'noAccountMonths' => $noAccountMonths,
            'noAccountTotal' => $noAccountTotal,
            'totals' => $totals,
            'grandTotal' => $grandTotal,
            'year' => $year,
            'years' => range(now()->year - 2, now()->year + 2),
            'importLogs' => $importLogs,
        ]);
    }

    public function create()
    {
        return Inertia::render('Budgets/Create', [
            'years' => range(now()->year - 2, now()->year + 2),
            'postAccounts' => PostAccount::orderBy('code')->get(['code', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'required|integer|between:1,12',
            'post_account' => 'nullable|string|max:50',
            'amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $validated['created_by'] = $request->user()->id;

        MonthlyBudget::updateOrCreate(
            ['year' => $validated['year'], 'month' => $validated['month'], 'post_account' => $validated['post_account']],
            $validated
        );

        return redirect('/budgets')->with('success', 'Budget saved.');
    }

    public function edit(MonthlyBudget $budget)
    {
        return Inertia::render('Budgets/Edit', [
            'budget' => $budget,
            'years' => range(now()->year - 2, now()->year + 2),
            'postAccounts' => PostAccount::orderBy('code')->get(['code', 'name']),
        ]);
    }

    public function update(Request $request, MonthlyBudget $budget)
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'required|integer|between:1,12',
            'post_account' => 'nullable|string|max:50',
            'amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $budget->update($validated);

        return redirect('/budgets')->with('success', 'Budget updated.');
    }

    public function export()
    {
        $budgets = MonthlyBudget::orderBy('year')->orderBy('month')->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="budgets-export.csv"',
        ];

        $callback = function () use ($budgets) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Year', 'Month', 'Post Account', 'Amount', 'Notes']);

            foreach ($budgets as $b) {
                fputcsv($handle, [
                    $b->year,
                    $b->month,
                    $b->post_account,
                    $b->amount,
                    $b->notes,
                ]);
            }

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

        Log::info('Budget import started', ['user_id' => $userId, 'file' => $fileName]);

        $handle = fopen($validated['file']->getRealPath(), 'r');
        $header = fgetcsv($handle);

        $expected = ['Year', 'Month', 'Post Account', 'Amount', 'Notes'];
        $normalized = array_map('trim', $header ?? []);
        if ($normalized !== $expected) {
            fclose($handle);
            Log::warning('Budget import aborted — invalid headers', ['user_id' => $userId, 'file' => $fileName, 'got' => $normalized]);
            ImportLog::create([
                'user_id' => $userId,
                'file_name' => $fileName,
                'type' => 'budget',
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

                $year = (int) $line[0];
                $month = (int) $line[1];

                if ($year < 2000 || $year > 2100 || $month < 1 || $month > 12) {
                    $errors[] = "Row {$row}: Invalid year/month";
                    Log::info('Budget import row skipped', ['user_id' => $userId, 'file' => $fileName, 'row' => $row, 'reason' => 'invalid_year_month']);
                    $row++;

                    continue;
                }

                $postAccount = $line[2] !== '' ? $line[2] : null;

                MonthlyBudget::updateOrCreate(
                    ['year' => $year, 'month' => $month, 'post_account' => $postAccount],
                    [
                        'post_account' => $postAccount,
                        'amount' => (float) ($line[3] ?: 0),
                        'notes' => $line[4] !== '' ? $line[4] : null,
                        'created_by' => $userId,
                    ]
                );

                $imported++;
                $row++;
            }
            DB::commit();
            Log::info('Budget import committed', ['user_id' => $userId, 'file' => $fileName, 'imported' => $imported, 'skipped' => count($errors)]);
            ImportLog::create([
                'user_id' => $userId,
                'file_name' => $fileName,
                'type' => 'budget',
                'status' => 'success',
                'imported' => $imported,
                'skipped' => count($errors),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            fclose($handle);
            Log::error('Budget import failed — rolled back', ['user_id' => $userId, 'file' => $fileName, 'error' => $e->getMessage()]);
            ImportLog::create([
                'user_id' => $userId,
                'file_name' => $fileName,
                'type' => 'budget',
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

        return redirect('/budgets')->with('success', $message);
    }

    public function destroy(MonthlyBudget $budget)
    {
        $budget->delete();

        return redirect('/budgets')->with('success', 'Budget deleted.');
    }
}
