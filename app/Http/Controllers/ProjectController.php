<?php

namespace App\Http\Controllers;

use App\Models\ActualExpense;
use App\Models\Asset;
use App\Models\Project;
use App\Models\ProjectMilestone;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $role = $user->getRoleNames()->first();

        if (! $user->can('manage projects') && ! $user->can('view org dashboards')) {
            abort(403);
        }

        $projects = Project::with('creator:id,name')
            ->withCount([
                'milestones',
                'milestones as completed_milestones_count' => fn ($q) => $q->where('status', 'completed'),
            ])
            ->latest()
            ->paginate(20);

        return Inertia::render('Projects/Index', ['projects' => $projects]);
    }

    public function create()
    {
        $assets = Asset::select('id', 'name', 'code')->orderBy('name')->get();

        return Inertia::render('Projects/Create', ['assets' => $assets]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'checkpoints' => 'required|array|min:1',
            'checkpoints.*.title' => 'required|string|max:255',
            'checkpoints.*.due_date' => 'required|date',
            'budget_items' => 'required|array|min:1',
            'budget_items.*.description' => 'required|string|max:255',
            'budget_items.*.qty' => 'required|numeric|min:0.01',
            'budget_items.*.amount' => 'required|numeric|min:0.01',
            'asset_id' => 'nullable|exists:assets,id',
        ]);

        $dates = collect($validated['checkpoints'])->pluck('due_date')->sort();
        $validated['start_date'] = $dates->first();
        $validated['end_date'] = $dates->last();
        $validated['budget_planned'] = collect($validated['budget_items'])->sum(fn ($i) => $i['qty'] * $i['amount']);

        $project = Project::create([...$validated, 'created_by' => $request->user()->id]);
        unset($validated['checkpoints']);

        foreach ($request->input('checkpoints') as $cp) {
            $project->milestones()->create($cp);
        }

        return redirect('/projects')->with('success', 'Project created.');
    }

    public function show(Project $project)
    {
        $project->load([
            'creator:id,name',
            'asset:id,name,code',
            'milestones' => fn ($q) => $q->orderBy('due_date'),
            'workOrders:id,title,status,created_at,project_id,actual_cost',
            'expenses' => fn ($q) => $q->with('creator:id,name')->orderByDesc('expense_date'),
        ]);

        return Inertia::render('Projects/Show', ['project' => $project]);
    }

    public function updateBudgetItems(Request $request, Project $project)
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $validated = $request->validate([
            'budget_items' => 'required|array|min:1',
            'budget_items.*.description' => 'required|string|max:255',
            'budget_items.*.qty' => 'required|numeric|min:0',
            'budget_items.*.amount' => 'required|numeric|min:0',
            'budget_items.*.actual_amount' => 'nullable|numeric|min:0',
        ]);

        $budgetActual = collect($validated['budget_items'])->sum(fn ($i) => (float) ($i['actual_amount'] ?? 0));
        $budgetPlanned = collect($validated['budget_items'])->sum(fn ($i) => $i['qty'] * $i['amount']);

        $project->update([
            'budget_items' => $validated['budget_items'],
            'budget_planned' => $budgetPlanned,
            'budget_actual' => $budgetActual,
        ]);

        ActualExpense::where('project_id', $project->id)
            ->where('document_ref', 'Auto from budget')
            ->delete();

        foreach ($validated['budget_items'] as $item) {
            $actual = (float) ($item['actual_amount'] ?? 0);
            if ($actual <= 0) {
                continue;
            }

            ActualExpense::create([
                'expense_date' => now()->toDateString(),
                'post_account' => null,
                'amount' => $actual,
                'description' => ($item['description'] ?: 'Budget item').' (auto)',
                'document_ref' => 'Auto from budget',
                'status' => 'actual',
                'project_id' => $project->id,
                'created_by' => $request->user()->id,
            ]);
        }

        return redirect("/projects/{$project->id}")->with('success', 'Budget updated.');
    }

    public function editTimeline(Project $project)
    {
        $project->load('milestones');

        return Inertia::render('Projects/EditTimeline', [
            'project' => $project,
        ]);
    }

    public function updateTimeline(Request $request, Project $project)
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $validated = $request->validate([
            'milestones' => 'required|array|min:1',
            'milestones.*.id' => 'nullable|exists:project_milestones,id',
            'milestones.*.title' => 'required|string|max:255',
            'milestones.*.due_date' => 'required|date',
            'milestones.*.status' => 'nullable|string|in:pending,in_progress,completed',
        ]);

        $submittedIds = collect($validated['milestones'])->pluck('id')->filter();

        $project->milestones()->whereNotIn('id', $submittedIds)->delete();

        $dates = collect();

        foreach ($validated['milestones'] as $ms) {
            if (! empty($ms['id'])) {
                ProjectMilestone::where('id', $ms['id'])->update([
                    'title' => $ms['title'],
                    'due_date' => $ms['due_date'],
                    'status' => $ms['status'] ?? 'pending',
                ]);
            } else {
                $project->milestones()->create([
                    'title' => $ms['title'],
                    'due_date' => $ms['due_date'],
                    'status' => $ms['status'] ?? 'pending',
                ]);
            }
            $dates->push($ms['due_date']);
        }

        $sorted = $dates->sort();
        $project->update([
            'start_date' => $sorted->first(),
            'end_date' => $sorted->last(),
        ]);

        return redirect("/projects/{$project->id}")->with('success', 'Timeline updated.');
    }
}
