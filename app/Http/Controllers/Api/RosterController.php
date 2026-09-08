<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RosterEntry;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RosterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $month = $request->input('month', now()->format('Y-m'));
        $date = Carbon::parse($month.'-01');
        $startOfMonth = $date->copy()->startOfMonth();
        $endOfMonth = $date->copy()->endOfMonth();

        $users = User::role(['technician', 'eng-admin', 'chief-engineer'])
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        $entries = RosterEntry::whereBetween('date', [$startOfMonth, $endOfMonth])
            ->get()
            ->keyBy(fn ($e) => $e->user_id.'-'.$e->date->format('Y-m-d'));

        $days = [];
        for ($d = $startOfMonth->copy(); $d->lte($endOfMonth); $d->addDay()) {
            $days[] = $d->format('Y-m-d');
        }

        return response()->json([
            'users' => $users,
            'entries' => $entries,
            'days' => $days,
            'month' => $month,
        ]);
    }

    public function store(Request $request): JsonResponse
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
            return response()->json(['message' => 'This entry is approved. Only Chief Engineer can edit approved entries.'], 422);
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

    public function destroy(Request $request, RosterEntry $rosterEntry): JsonResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);

        if ($rosterEntry->isApproved() && ! $request->user()->can('approve roster')) {
            return response()->json(['message' => 'This entry is approved. Only Chief Engineer can delete approved entries.'], 422);
        }

        $rosterEntry->delete();

        return response()->json(['message' => 'Roster entry removed.']);
    }

    public function approve(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('approve roster'), 403);

        $validated = $request->validate([
            'entry_id' => 'required|exists:roster_entries,id',
        ]);

        $entry = RosterEntry::findOrFail($validated['entry_id']);
        $entry->approved_by = $request->user()->id;
        $entry->approved_at = now();
        $entry->save();

        return response()->json($entry);
    }

    public function approveMonth(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('approve roster'), 403);

        $month = $request->input('month', now()->format('Y-m'));
        $date = Carbon::parse($month.'-01');
        $startOfMonth = $date->copy()->startOfMonth();
        $endOfMonth = $date->copy()->endOfMonth();

        RosterEntry::whereBetween('date', [$startOfMonth, $endOfMonth])
            ->whereNull('approved_at')
            ->update([
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ]);

        return response()->json(['message' => 'Month approved.']);
    }

    public function unapprove(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('approve roster'), 403);

        $validated = $request->validate([
            'entry_id' => 'required|exists:roster_entries,id',
        ]);

        $entry = RosterEntry::findOrFail($validated['entry_id']);
        $entry->approved_by = null;
        $entry->approved_at = null;
        $entry->save();

        return response()->json($entry);
    }

    public function unapproveMonth(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('approve roster'), 403);

        $month = $request->input('month', now()->format('Y-m'));
        $date = Carbon::parse($month.'-01');
        $startOfMonth = $date->copy()->startOfMonth();
        $endOfMonth = $date->copy()->endOfMonth();

        RosterEntry::whereBetween('date', [$startOfMonth, $endOfMonth])
            ->whereNotNull('approved_at')
            ->update([
                'approved_by' => null,
                'approved_at' => null,
            ]);

        return response()->json(['message' => 'Month unapproved.']);
    }
}
