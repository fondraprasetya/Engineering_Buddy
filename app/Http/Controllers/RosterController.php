<?php

namespace App\Http\Controllers;

use App\Models\RosterEntry;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RosterController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $month = $request->input('month', now()->format('Y-m'));
        $date = Carbon::parse($month.'-01');
        $startOfMonth = $date->copy()->startOfMonth();
        $endOfMonth = $date->copy()->endOfMonth();

        $users = User::role(['technician', 'eng-admin', 'chief-engineer'])
            ->select('id', 'name')
            ->with('roles:id,name')
            ->orderBy('name')
            ->get();

        $entries = RosterEntry::whereBetween('date', [$startOfMonth, $endOfMonth])
            ->get()
            ->keyBy(fn ($e) => $e->user_id.'-'.$e->date->format('Y-m-d'));

        $days = [];
        $dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for ($d = $startOfMonth->copy(); $d->lte($endOfMonth); $d->addDay()) {
            $days[] = [
                'date' => $d->format('Y-m-d'),
                'day' => (int) $d->format('d'),
                'dow' => (int) $d->format('w'),
            ];
        }

        return Inertia::render('Roster/Index', [
            'users' => $users,
            'entries' => $entries,
            'days' => $days,
            'month' => $month,
            'prevMonth' => $date->copy()->subMonth()->format('Y-m'),
            'nextMonth' => $date->copy()->addMonth()->format('Y-m'),
            'dayNames' => $dayNames,
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'shift' => 'required|in:morning,afternoon,night,off,leave,extra_off',
            'time_blocks' => 'nullable|array',
            'time_blocks.*.in' => 'required|date_format:H:i',
            'time_blocks.*.out' => 'required|date_format:H:i',
        ]);

        $existing = RosterEntry::where('user_id', $validated['user_id'])
            ->where('date', $validated['date'])
            ->first();

        if ($existing && $existing->isApproved() && ! $request->user()->can('approve roster')) {
            return back()->withErrors(['shift' => 'This entry is approved. Only Chief Engineer can edit approved entries.']);
        }

        RosterEntry::updateOrCreate(
            ['user_id' => $validated['user_id'], 'date' => $validated['date']],
            [
                'shift' => $validated['shift'],
                'time_blocks' => $validated['time_blocks'] ?? null,
                'created_by' => $request->user()->id,
                'notes' => $request->input('notes'),
            ],
        );

        return back()->with('success', 'Roster updated.');
    }

    public function destroy(Request $request, RosterEntry $rosterEntry)
    {
        abort_unless($request->user()->can('manage projects'), 403);

        if ($rosterEntry->isApproved() && ! $request->user()->can('approve roster')) {
            return back()->withErrors(['shift' => 'This entry is approved. Only Chief Engineer can delete approved entries.']);
        }

        $rosterEntry->delete();

        return back()->with('success', 'Roster entry removed.');
    }
}
