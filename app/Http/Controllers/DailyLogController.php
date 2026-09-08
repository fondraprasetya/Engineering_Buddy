<?php

namespace App\Http\Controllers;

use App\Models\DailyLog;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DailyLogController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $role = $user->getRoleNames()->first();

        $query = DailyLog::with(['technician:id,name', 'workOrder:id,title']);

        if ($role === 'technician') {
            $query->where('technician_id', $user->id);
        } elseif (! in_array($role, ['eng-admin', 'chief-engineer', 'gm', 'super-admin'])) {
            abort(403);
        }

        if ($request->technician_id) {
            $query->where('technician_id', $request->technician_id);
        }
        if ($request->date_from) {
            $query->where('log_date', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->where('log_date', '<=', $request->date_to);
        }

        $logs = $query->latest('log_date')->paginate(20);

        $technicians = User::role('technician')->select('id', 'name')->get();

        return Inertia::render('DailyLogs/Index', [
            'logs' => $logs,
            'technicians' => $technicians,
            'filters' => $request->only(['technician_id', 'date_from', 'date_to']),
        ]);
    }

    public function create(Request $request)
    {
        $workOrders = WorkOrder::whereHas('technicianAssignments', fn ($q) => $q->where('technician_id', $request->user()->id))
            ->whereIn('status', ['assigned', 'in_progress'])
            ->select('id', 'title')
            ->get();

        return Inertia::render('DailyLogs/Create', [
            'workOrders' => $workOrders,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'log_date' => 'required|date',
            'activities' => 'required|string|max:1000',
            'hours_worked' => 'required|numeric|min:0.5|max:24',
            'issues_found' => 'nullable|string|max:1000',
            'work_order_id' => 'nullable|exists:work_orders,id',
        ]);

        DailyLog::create([
            ...$validated,
            'technician_id' => $request->user()->id,
        ]);

        return redirect('/daily-logs')->with('success', 'Daily log saved.');
    }
}
