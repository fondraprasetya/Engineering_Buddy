<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RosterEntry;
use Illuminate\Http\Request;

class RosterController extends Controller
{
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
            return response()->json(['message' => 'This entry is approved. Only Chief Engineer can edit approved entries.'], 403);
        }

        $entry = RosterEntry::updateOrCreate(
            ['user_id' => $validated['user_id'], 'date' => $validated['date']],
            [
                'shift' => $validated['shift'],
                'time_blocks' => $validated['time_blocks'] ?? null,
                'created_by' => $request->user()->id,
                'notes' => $request->input('notes'),
            ],
        );

        return response()->json($entry, 201);
    }

    public function destroy(Request $request, RosterEntry $rosterEntry)
    {
        abort_unless($request->user()->can('manage projects'), 403);

        if ($rosterEntry->isApproved() && ! $request->user()->can('approve roster')) {
            return response()->json(['message' => 'This entry is approved. Only Chief Engineer can delete approved entries.'], 403);
        }

        $rosterEntry->delete();

        return response()->noContent();
    }

    public function approve(Request $request)
    {
        abort_unless($request->user()->can('approve roster'), 403);

        $entry = RosterEntry::findOrFail($request->validate(['entry_id' => 'required|exists:roster_entries,id'])['entry_id']);
        $entry->update(['approved_at' => now()]);

        return response()->json($entry);
    }

    public function unapprove(Request $request)
    {
        abort_unless($request->user()->can('approve roster'), 403);

        $entry = RosterEntry::findOrFail($request->validate(['entry_id' => 'required|exists:roster_entries,id'])['entry_id']);
        $entry->update(['approved_at' => null]);

        return response()->json($entry);
    }

    public function approveMonth(Request $request)
    {
        abort_unless($request->user()->can('approve roster'), 403);

        $month = $request->validate(['month' => 'required|date_format:Y-m'])['month'];
        $count = RosterEntry::where('date', 'like', $month.'%')->whereNull('approved_at')->update(['approved_at' => now()]);

        return response()->json(['approved' => $count]);
    }

    public function unapproveMonth(Request $request)
    {
        abort_unless($request->user()->can('approve roster'), 403);

        $month = $request->validate(['month' => 'required|date_format:Y-m'])['month'];
        $count = RosterEntry::where('date', 'like', $month.'%')->whereNotNull('approved_at')->update(['approved_at' => null]);

        return response()->json(['unapproved' => $count]);
    }
}
