<?php

namespace App\Http\Controllers;

use App\Models\PostAccount;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PostAccountController extends Controller
{
    public function index()
    {
        $accounts = PostAccount::with('creator:id,name')
            ->orderBy('code')
            ->paginate(20);

        return Inertia::render('PostAccounts/Index', [
            'accounts' => $accounts,
        ]);
    }

    public function create()
    {
        return Inertia::render('PostAccounts/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:post_accounts,code',
            'name' => 'required|string|max:200',
            'description' => 'nullable|string|max:500',
        ]);

        $validated['created_by'] = $request->user()->id;

        PostAccount::create($validated);

        return redirect('/post-accounts')->with('success', 'Post account created.');
    }

    public function edit(PostAccount $postAccount)
    {
        return Inertia::render('PostAccounts/Edit', [
            'account' => $postAccount,
        ]);
    }

    public function update(Request $request, PostAccount $postAccount)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:post_accounts,code,'.$postAccount->id,
            'name' => 'required|string|max:200',
            'description' => 'nullable|string|max:500',
        ]);

        $postAccount->update($validated);

        return redirect('/post-accounts')->with('success', 'Post account updated.');
    }

    public function destroy(PostAccount $postAccount)
    {
        $postAccount->delete();

        return redirect('/post-accounts')->with('success', 'Post account deleted.');
    }
}
