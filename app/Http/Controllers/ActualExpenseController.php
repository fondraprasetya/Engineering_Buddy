<?php

namespace App\Http\Controllers;

use App\Models\ActualExpense;
use App\Models\MaintenanceSchedule;
use App\Models\PostAccount;
use App\Models\Project;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ActualExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = ActualExpense::with(['creator:id,name', 'workOrder:id,title', 'project:id,name', 'maintenanceSchedule:id,next_due_date'])
            ->orderByDesc('expense_date')->orderByDesc('id');

        if ($request->month) {
            $query->whereYear('expense_date', substr($request->month, 0, 4))
                ->whereMonth('expense_date', substr($request->month, 5, 2));
        }

        $totalAmount = (clone $query)->sum('amount');
        $expenses = $query->paginate(20);

        $dateFormat = DB::connection()->getDriverName() === 'mysql'
            ? "DATE_FORMAT(expense_date, '%Y-%m')"
            : "strftime('%Y-%m', expense_date)";

        $months = ActualExpense::selectRaw("{$dateFormat} as ym")
            ->groupBy('ym')
            ->orderByDesc('ym')
            ->pluck('ym');

        return Inertia::render('Expenses/Index', [
            'expenses' => $expenses,
            'totalAmount' => (float) $totalAmount,
            'months' => $months,
            'filterMonth' => $request->month,
        ]);
    }

    public function create()
    {
        return Inertia::render('Expenses/Create', [
            'postAccounts' => PostAccount::orderBy('code')->get(['code', 'name']),
            'workOrders' => WorkOrder::select('id', 'title')->orderByDesc('id')->limit(50)->get(),
            'projects' => Project::select('id', 'name')->orderByDesc('id')->limit(50)->get(),
            'schedules' => MaintenanceSchedule::select('id', 'next_due_date')->with('asset:id,name')->orderByDesc('id')->limit(50)->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'expense_date' => 'required|date',
            'post_account' => 'nullable|string|max:50',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string|max:1000',
            'document_ref' => 'nullable|string|max:100',
            'status' => 'required|in:actual,accrue',
            'work_order_id' => 'nullable|exists:work_orders,id',
            'project_id' => 'nullable|exists:projects,id',
            'maintenance_schedule_id' => 'nullable|exists:maintenance_schedules,id',
        ]);

        $validated['created_by'] = $request->user()->id;

        ActualExpense::create($validated);

        return redirect('/expenses')->with('success', 'Expense recorded.');
    }

    public function edit(ActualExpense $expense)
    {
        $expense->load(['workOrder:id,title', 'project:id,name', 'maintenanceSchedule:id,next_due_date']);

        return Inertia::render('Expenses/Edit', [
            'expense' => $expense,
            'postAccounts' => PostAccount::orderBy('code')->get(['code', 'name']),
            'workOrders' => WorkOrder::select('id', 'title')->orderByDesc('id')->limit(50)->get(),
            'projects' => Project::select('id', 'name')->orderByDesc('id')->limit(50)->get(),
            'schedules' => MaintenanceSchedule::select('id', 'next_due_date')->with('asset:id,name')->orderByDesc('id')->limit(50)->get(),
        ]);
    }

    public function update(Request $request, ActualExpense $expense)
    {
        $validated = $request->validate([
            'expense_date' => 'required|date',
            'post_account' => 'nullable|string|max:50',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string|max:1000',
            'document_ref' => 'nullable|string|max:100',
            'status' => 'required|in:actual,accrue',
            'work_order_id' => 'nullable|exists:work_orders,id',
            'project_id' => 'nullable|exists:projects,id',
            'maintenance_schedule_id' => 'nullable|exists:maintenance_schedules,id',
        ]);

        $expense->update($validated);

        return redirect('/expenses')->with('success', 'Expense updated.');
    }

    public function destroy(ActualExpense $expense)
    {
        $expense->delete();

        return redirect('/expenses')->with('success', 'Expense deleted.');
    }
}
