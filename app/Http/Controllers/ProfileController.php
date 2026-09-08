<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function show(Request $request, TelegramService $telegram)
    {
        $link = $request->user()->telegramLink()->whereNotNull('linked_at')->first();

        return Inertia::render('Profile', [
            'telegramStatus' => $link ? [
                'linked' => true,
                'chat_id' => $link->chat_id,
                'linked_at' => $link->linked_at,
            ] : ['linked' => false],
        ]);
    }

    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $request->user()->update([
            'password' => $validated['password'],
        ]);

        return back()->with('success', 'Password updated.');
    }

    public function updateProfile(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $request->user()->update($validated);

        return back()->with('success', 'Profile updated.');
    }

    public function updatePhoto(Request $request)
    {
        $validated = $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $path = $request->file('photo')->store('profile-photos', 'public');

        $request->user()->update(['photo' => $path]);

        return back()->with('success', 'Profile photo updated.');
    }

    public function history(Asset $asset)
    {
        abort_unless(auth()->user()->can('view asset history'), 403);

        $asset->load([
            'workOrders' => function ($q) {
                $q->with(['requester:id,name', 'approvals.approver:id,name', 'checklistResponses.field'])
                    ->latest();
            },
            'maintenanceSchedules',
        ]);

        $dailyLogs = $asset->workOrders()
            ->with('dailyLogs.technician:id,name')
            ->get()
            ->pluck('dailyLogs')
            ->flatten()
            ->sortByDesc('log_date')
            ->values();

        return Inertia::render('Assets/History', [
            'asset' => $asset->only(['id', 'name', 'code', 'category', 'location', 'status']),
            'workOrders' => $asset->workOrders,
            'maintenanceSchedules' => $asset->maintenanceSchedules,
            'dailyLogs' => $dailyLogs,
        ]);
    }
}
