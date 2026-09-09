<?php

namespace App\Http\Controllers;

use App\Models\CalendarEvent;
use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CalendarEventController extends Controller
{
    public function index(Request $request)
    {
        $areaId = Location::where('type', 'area')->where('name', 'Meeting Room')->value('id');

        return Inertia::render('Calendar/Index', [
            'venues' => $areaId
                ? Location::where('parent_id', $areaId)->where('type', 'room')->orderBy('name')->get(['id', 'name', 'code'])
                : [],
        ]);
    }

    public function events(Request $request)
    {
        $request->validate([
            'start' => 'required|date',
            'end' => 'required|date|after_or_equal:start',
        ]);

        $user = $request->user();
        $role = $user->getRoleNames()->first();
        $isAdmin = in_array($role, ['eng-admin', 'super-admin']);

        $query = CalendarEvent::with('creator:id,name')
            ->whereBetween('start_datetime', [$request->start, $request->end])
            ->orWhere(function ($q) use ($request) {
                $q->where('start_datetime', '<', $request->start)
                    ->where('end_datetime', '>', $request->end);
            });

        if (! $isAdmin) {
            $query->where('user_id', $user->id);
        }

        return response()->json($query->orderBy('start_datetime')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_datetime' => 'required|date',
            'end_datetime' => 'required|date|after_or_equal:start_datetime',
            'all_day' => 'boolean',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'venue' => 'nullable|string|max:255',
            'type' => 'nullable|string|in:half_day,full_day,full_board',
            'room_occupied' => 'nullable|integer|min:0',
            'guest_count' => 'nullable|integer|min:0',
            'restaurant_customer_count' => 'nullable|integer|min:0',
            'meeting_customer_count' => 'nullable|integer|min:0',
            'room_available' => 'nullable|integer|min:0',
            'mtd_room_occupied' => 'nullable|integer|min:0',
            'mtd_room_available' => 'nullable|integer|min:0',
            'mtd_guest_count' => 'nullable|integer|min:0',
            'mtd_restaurant_customer_count' => 'nullable|integer|min:0',
            'mtd_mice_customer' => 'nullable|integer|min:0',
            'pax' => 'nullable|integer|min:0',
        ]);

        if ($request->hasFile('file')) {
            $validated['file_path'] = $request->file('file')->store('calendar-files', 'public');
        }

        $event = CalendarEvent::create([
            ...$validated,
            'user_id' => $request->user()->id,
        ]);

        return response()->json($event->load('creator:id,name'), 201);
    }

    public function update(Request $request, CalendarEvent $calendarEvent)
    {
        $user = $request->user();
        $role = $user->getRoleNames()->first();
        $isAdmin = in_array($role, ['eng-admin', 'super-admin']);

        abort_unless($calendarEvent->user_id === $user->id || $isAdmin, 403);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_datetime' => 'required|date',
            'end_datetime' => 'required|date|after_or_equal:start_datetime',
            'all_day' => 'boolean',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'file' => 'nullable|file|mimes:pdf|max:10240',
            'venue' => 'nullable|string|max:255',
            'type' => 'nullable|string|in:half_day,full_day,full_board',
            'room_occupied' => 'nullable|integer|min:0',
            'guest_count' => 'nullable|integer|min:0',
            'restaurant_customer_count' => 'nullable|integer|min:0',
            'meeting_customer_count' => 'nullable|integer|min:0',
            'room_available' => 'nullable|integer|min:0',
            'mtd_room_occupied' => 'nullable|integer|min:0',
            'mtd_room_available' => 'nullable|integer|min:0',
            'mtd_guest_count' => 'nullable|integer|min:0',
            'mtd_restaurant_customer_count' => 'nullable|integer|min:0',
            'mtd_mice_customer' => 'nullable|integer|min:0',
            'pax' => 'nullable|integer|min:0',
        ]);

        if ($request->hasFile('file')) {
            if ($calendarEvent->file_path) {
                Storage::disk('public')->delete($calendarEvent->file_path);
            }
            $validated['file_path'] = $request->file('file')->store('calendar-files', 'public');
        }

        $calendarEvent->update($validated);

        return response()->json($calendarEvent->load('creator:id,name'));
    }

    public function destroy(Request $request, CalendarEvent $calendarEvent)
    {
        $user = $request->user();
        $role = $user->getRoleNames()->first();
        $isAdmin = in_array($role, ['eng-admin', 'super-admin']);

        abort_unless($calendarEvent->user_id === $user->id || $isAdmin, 403);

        $calendarEvent->delete();

        return response()->noContent();
    }
}
