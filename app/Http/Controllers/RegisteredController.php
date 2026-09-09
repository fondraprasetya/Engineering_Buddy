<?php

namespace App\Http\Controllers;

use App\Services\ProvisionTenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class RegisteredController extends Controller
{
    public function create()
    {
        return Inertia::render('Register');
    }

    public function store(Request $request, ProvisionTenant $provision)
    {
        $data = $request->validate([
            'tenant_name' => ['required', 'string', 'max:255'],
            'owner_name'  => ['required', 'string', 'max:255'],
            'email'       => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password'    => ['required', 'confirmed', Password::min(8)],
        ]);

        try {
            [$tenant, $user] = $provision->provision(
                name: $data['tenant_name'],
                ownerEmail: $data['email'],
                ownerName: $data['owner_name'],
                password: $data['password'],
                plan: 'trial',
            );
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['email' => 'Could not create the account. Please try again.']);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->intended('/dashboard');
    }
}
