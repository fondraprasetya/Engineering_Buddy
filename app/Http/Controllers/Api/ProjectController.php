<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActualExpense;
use App\Models\Project;
use App\Models\ProjectMilestone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage projects') || $request->user()->can('view org dashboards'), 403);

        return response()->json(
            Project::withCount('milestones')
                ->latest()
                ->paginate(20)
        );
    }

    public function store(Request $request): JsonResponse
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

        return response()->json($project->fresh()->load('milestones'), 201);
    }

    public function show(Project $project): JsonResponse
    {
        return response()->json(
            $project->load([
                'creator:id,name',
                'asset:id,name,code',
                'milestones' => fn ($q) => $q->orderBy('due_date'),
                'workOrders' => fn ($q) => $q->latest()->limit(10),
            ])
        );
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'budget_planned' => 'sometimes|numeric|min:0',
            'budget_actual' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|in:planned,in_progress,completed,cancelled',
        ]);

        $project->update($validated);

        return response()->json($project->fresh());
    }

    public function addMilestone(Request $request, Project $project): JsonResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'due_date' => 'required|date',
            'status' => 'sometimes|in:pending,in_progress,completed',
        ]);

        $milestone = $project->milestones()->create($validated);

        return response()->json($milestone, 201);
    }

    public function updateMilestoneStatus(Request $request, ProjectMilestone $milestone): JsonResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $validated = $request->validate([
            'status' => 'required|in:pending,in_progress,completed',
        ]);

        $milestone->update($validated);

        return response()->json($milestone->fresh());
    }

    public function uploadMilestonePhoto(Request $request, ProjectMilestone $milestone): JsonResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        $path = $request->file('photo')->store('milestones', 'public');

        $photos = $milestone->photos ?? [];
        $photos[] = $path;
        $milestone->update(['photos' => $photos]);

        return response()->json($milestone->fresh());
    }

    public function updateBudgetItems(Request $request, Project $project): JsonResponse
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

        return response()->json($project->fresh());
    }
}
