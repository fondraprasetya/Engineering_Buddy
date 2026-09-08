<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->can('manage users'), 403);

        $users = User::with('department:id,name', 'roles')
            ->when($request->search, fn ($q, $v) => $q->where('name', 'like', "%{$v}%")->orWhere('email', 'like', "%{$v}%"))
            ->latest()
            ->paginate(20);

        return Inertia::render('Users/Index', ['users' => $users]);
    }

    public function create()
    {
        abort_unless(request()->user()->can('manage users'), 403);

        $deptHeads = User::whereHas('roles', fn ($q) => $q->where('name', 'dept-head'))
            ->select('id', 'name', 'department_id')
            ->with('department:id,name')
            ->get()
            ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'department' => $u->department?->name]);

        return Inertia::render('Users/Create', [
            'departments' => Department::select('id', 'name')->get(),
            'roles' => Role::select('id', 'name')->get(),
            'deptHeads' => $deptHeads,
        ]);
    }

    public function store(Request $request)
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
            'dept_head_id' => 'nullable|exists:users,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'department_id' => $validated['department_id'] ?? null,
            'dept_head_id' => $validated['dept_head_id'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $user->syncRoles([$validated['role']]);

        return redirect('/users')->with('success', 'User created.');
    }

    public function edit(User $user)
    {
        abort_unless(request()->user()->can('manage users'), 403);

        $user->load('roles');

        $deptHeads = User::whereHas('roles', fn ($q) => $q->where('name', 'dept-head'))
            ->select('id', 'name', 'department_id')
            ->with('department:id,name')
            ->get()
            ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'department' => $u->department?->name]);

        return Inertia::render('Users/Edit', [
            'user' => $user,
            'departments' => Department::select('id', 'name')->get(),
            'roles' => Role::select('id', 'name')->get(),
            'deptHeads' => $deptHeads,
        ]);
    }

    public function update(Request $request, User $user)
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
            'dept_head_id' => 'nullable|exists:users,id',
        ]);

        $data = collect($validated)->except('role', 'password')->filter(fn ($v) => ! is_null($v))->toArray();

        if (! empty($validated['password'])) {
            $data['password'] = $validated['password'];
        }

        $user->update($data);

        if (! empty($validated['role'])) {
            $user->syncRoles([$validated['role']]);
        }

        return redirect('/users')->with('success', 'User updated.');
    }
}
