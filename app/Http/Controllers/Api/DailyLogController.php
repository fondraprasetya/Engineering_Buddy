<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyLogController extends Controller
{
    public function index(Request $request): JsonResponse
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

        return response()->json($query->latest('log_date')->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'log_date' => 'required|date',
            'activities' => 'required|string|max:1000',
            'hours_worked' => 'required|numeric|min:0.5|max:24',
            'issues_found' => 'nullable|string|max:1000',
            'work_order_id' => 'nullable|exists:work_orders,id',
        ]);

        $log = DailyLog::create([
            ...$validated,
            'technician_id' => $request->user()->id,
        ]);

        return response()->json($log->load('workOrder:id,title'), 201);
    }
}
