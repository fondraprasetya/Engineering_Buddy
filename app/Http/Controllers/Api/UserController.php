<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage users'), 403);

        $users = User::with('department:id,name', 'roles')
            ->when($request->search, fn ($q, $v) => $q->where('name', 'like', "%{$v}%")->orWhere('email', 'like', "%{$v}%"))
            ->latest()
            ->paginate(20);

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage users'), 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'department_id' => 'nullable|exists:departments,id',
            'phone' => 'nullable|string|max:50',
            'is_active' => 'boolean',
            'role' => 'required|exists:roles,name',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'department_id' => $validated['department_id'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $user->syncRoles([$validated['role']]);

        return response()->json($user->load('roles'), 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        abort_unless($request->user()->can('manage users'), 403);

        return response()->json($user->load('department:id,name', 'roles'));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        abort_unless($request->user()->can('manage users'), 403);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => 'nullable|string|min:8',
            'department_id' => 'nullable|exists:departments,id',
            'phone' => 'nullable|string|max:50',
            'is_active' => 'boolean',
            'role' => 'sometimes|exists:roles,name',
        ]);

        $data = collect($validated)->except('role', 'password')->filter(fn ($v) => ! is_null($v))->toArray();

        if (! empty($validated['password'])) {
            $data['password'] = $validated['password'];
        }

        $user->update($data);

        if (! empty($validated['role'])) {
            $user->syncRoles([$validated['role']]);
        }

        return response()->json($user->fresh()->load('roles'));
    }
}
