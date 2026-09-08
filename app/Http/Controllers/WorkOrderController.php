<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\Location;
use App\Models\Project;
use App\Models\WorkOrder;
use App\Services\WorkOrderService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WorkOrderController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $role = $user->getRoleNames()->first();

        $query = WorkOrder::with(['requester:id,name', 'asset:id,name', 'location:id,name,code', 'project:id,name']);

        if ($role === 'employee') {
            $query->where('requester_id', $user->id);
        } elseif ($role === 'dept-head') {
            $query->whereHas('requester', fn ($q) => $q->where('department_id', $user->department_id));
        } elseif ($role === 'technician') {
            $query->whereHas('technicianAssignments', fn ($q) => $q->where('technician_id', $user->id));
        } elseif ($role === 'gm') {
            $query->whereIn('status', ['completed', 'closed']);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($priority = $request->input('priority')) {
            $query->where('priority', $priority);
        }

        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        return Inertia::render('WorkOrders/Index', [
            'workOrders' => $query->latest()->paginate(20),
            'filters' => $request->only(['status', 'priority', 'date_from', 'date_to']),
        ]);
    }

    private function locationOptions(): array
    {
        $all = Location::orderBy('name')->get();
        $grouped = $all->groupBy('parent_id');
        $options = [];

        $walk = function ($parentId, $depth) use (&$walk, $grouped, &$options) {
            foreach ($grouped[$parentId] ?? [] as $loc) {
                $prefix = str_repeat('─ ', $depth);
                $label = $depth > 0 ? $prefix.$loc->name : $loc->name;
                if ($loc->code) {
                    $label .= " ({$loc->code})";
                }
                $options[] = ['id' => $loc->id, 'label' => $label];
                $walk($loc->id, $depth + 1);
            }
        };

        $walk(null, 0);

        return $options;
    }

    public function create(Request $request)
    {
        $assets = Asset::all();
        $projects = Project::select('id', 'name')->get();

        return Inertia::render('WorkOrders/Create', [
            'assets' => $assets,
            'projects' => $projects,
            'locationOptions' => $this->locationOptions(),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->can('create work orders'), 403);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'asset_id' => 'nullable|exists:assets,id',
            'location_id' => 'nullable|exists:locations,id',
            'priority' => 'required|in:low,medium,high,urgent',
            'project_id' => 'nullable|exists:projects,id',
            'actual_cost' => 'nullable|numeric|min:0',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('work-order-photos', 'public');
        }

        $workOrder = WorkOrder::create([
            ...$validated,
            'requester_id' => $request->user()->id,
            'status' => 'pending_dept_head',
        ]);

        if ($workOrder->project_id) {
            $workOrder->syncProjectBudget();
        }

        return redirect('/work-orders')->with('success', 'Work order created.');
    }

    public function show(Request $request, WorkOrder $workOrder)
    {
        $workOrder->load([
            'requester:id,name,department_id',
            'requester.department:id,name',
            'asset:id,name,code',
            'location:id,name,code',
            'project:id,name,budget_planned,budget_actual',
            'approvals.approver:id,name,department_id',
            'approvals.approver.department:id,name',
            'technicianAssignments.technician:id,name',
            'checklistTemplate:id,name',
        ]);

        $reviewerRole = app(WorkOrderService::class)->reviewerRole($workOrder, $workOrder->status);

        $user = $request->user();
        $isReviewer = in_array($workOrder->status, ['pending_dept_head', 'pending_chief_engineer', 'pending_check', 'pending_close'], true)
            && $reviewerRole === 'chief-engineer'
                ? $user->hasRole('chief-engineer')
                : ($user->hasRole('dept-head') && $user->department_id === $workOrder->requester->department_id);

        return Inertia::render('WorkOrders/Show', [
            'workOrder' => $workOrder,
            'reviewerRole' => $reviewerRole,
            'isReviewer' => $isReviewer,
        ]);
    }

    public function checklistPdf(Request $request, WorkOrder $workOrder)
    {
        $user = $request->user();

        $isAssigned = $workOrder->technicianAssignments()->where('technician_id', $user->id)->exists();

        abort_unless(
            $isAssigned
                || $workOrder->requester_id === $user->id
                || $user->can('manage assets')
                || in_array($user->getRoleNames()->first(), ['dept-head', 'chief-engineer', 'gm', 'super-admin'], true),
            403
        );

        $workOrder->load([
            'requester:id,name',
            'requester.department:id,name',
            'asset:id,name,code',
            'technicianAssignments.technician:id,name',
            'checklistTemplate.fields',
            'checklistResponses.field',
        ]);

        abort_unless($workOrder->checklistTemplate, 404);

        $fields = $workOrder->checklistTemplate->fields->groupBy('page')->sortKeys();
        $responses = $workOrder->checklistResponses->keyBy('field_id');

        $pdf = Pdf::loadView('pdf.checklist', [
            'workOrder' => $workOrder,
            'fields' => $fields,
            'responses' => $responses,
        ])
            ->setPaper('a4')
            ->setOptions([
                'isRemoteEnabled' => true,
                'defaultFont' => 'DejaVu Sans',
                'margin_top' => '10mm',
                'margin_right' => '10mm',
                'margin_bottom' => '10mm',
                'margin_left' => '10mm',
            ]);

        return $pdf->download('work-order-'.$workOrder->id.'-checklist.pdf');
    }
}
