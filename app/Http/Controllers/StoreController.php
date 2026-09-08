<?php

namespace App\Http\Controllers;

use App\Models\StoreCategory;
use App\Models\StoreItem;
use App\Models\StoreReceiving;
use App\Models\StoreRequest;
use App\Models\StoreStockAdjustment;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StoreController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $role = $user->getRoleNames()->first();
        $isTechnician = $role === 'technician';

        $tab = $isTechnician ? 'requests' : ($request->tab ?? 'items');

        $categories = $isTechnician ? collect() : StoreCategory::orderBy('type')->orderBy('name')->get(['id', 'name', 'type']);
        $items = $isTechnician ? collect() : StoreItem::with('category:id,name,type')->orderBy('name')->get()->map(fn ($i) => [
            'id' => $i->id,
            'name' => $i->name,
            'unit' => $i->unit,
            'stock' => $i->stock,
            'minimum_stock' => $i->minimum_stock,
            'category_name' => $i->category?->name,
            'type' => $i->category?->type,
        ]);

        $receivings = $isTechnician ? new LengthAwarePaginator([], 0, 20) : StoreReceiving::with(['item:id,name,unit', 'creator:id,name'])
            ->orderByDesc('receipt_date')->orderByDesc('id')->paginate(20);

        $requests = StoreRequest::with(['item:id,name,unit', 'workOrder:id,title', 'requester:id,name', 'approver:id,name'])
            ->when($isTechnician, fn ($q) => $q->where('requested_by', $user->id))
            ->orderByDesc('created_at')->paginate(20);

        $pendingCount = StoreRequest::where('status', 'pending')->count();
        $lowStockItems = StoreItem::whereNotNull('minimum_stock')
            ->whereColumn('stock', '<=', 'minimum_stock')->count();

        $adjustments = $isTechnician ? collect() : StoreStockAdjustment::with(['item:id,name', 'requester:id,name', 'approver:id,name'])
            ->orderByDesc('created_at')->get();

        return Inertia::render('Store/Index', [
            'tab' => $tab,
            'categories' => $categories,
            'items' => $items,
            'receivings' => $receivings,
            'requests' => $requests,
            'adjustments' => $adjustments,
            'isChiefEngineer' => $role === 'chief-engineer',
            'pendingCount' => $pendingCount,
            'lowStockCount' => $lowStockItems,
            'isTechnician' => $isTechnician,
        ]);
    }

    public function categories(): Response
    {
        $categories = StoreCategory::withCount('items')->orderBy('type')->orderBy('name')->get();

        return Inertia::render('Store/Categories', ['categories' => $categories]);
    }

    public function storeCategory(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:supply,tool',
        ]);

        StoreCategory::create($validated);

        return redirect('/store/categories')->with('success', 'Category created.');
    }

    public function deleteCategory(StoreCategory $storeCategory): RedirectResponse
    {
        abort_unless(request()->user()->can('manage projects'), 403);
        abort_if($storeCategory->items()->count() > 0, 422, 'Cannot delete category with items.');

        $storeCategory->delete();

        return redirect('/store/categories')->with('success', 'Category deleted.');
    }

    public function createItem(): Response
    {
        $categories = StoreCategory::orderBy('type')->orderBy('name')->get(['id', 'name', 'type']);

        return Inertia::render('Store/Items/Create', ['categories' => $categories]);
    }

    public function storeItem(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $validated = $request->validate([
            'category_id' => 'nullable|exists:store_categories,id',
            'name' => 'required|string|max:255',
            'unit' => 'required|string|max:20',
            'minimum_stock' => 'nullable|integer|min:0',
        ]);

        $validated['created_by'] = $request->user()->id;
        $validated['stock'] = 0;

        StoreItem::create($validated);

        return redirect('/store')->with('success', 'Item added.');
    }

    public function editItem(StoreItem $storeItem): Response
    {
        $categories = StoreCategory::orderBy('type')->orderBy('name')->get(['id', 'name', 'type']);

        return Inertia::render('Store/Items/Edit', [
            'item' => $storeItem->load('category:id,name,type'),
            'categories' => $categories,
        ]);
    }

    public function updateItem(Request $request, StoreItem $storeItem): RedirectResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $validated = $request->validate([
            'category_id' => 'nullable|exists:store_categories,id',
            'name' => 'required|string|max:255',
            'unit' => 'required|string|max:20',
            'minimum_stock' => 'nullable|integer|min:0',
        ]);

        $storeItem->update($validated);

        return redirect('/store')->with('success', 'Item updated.');
    }

    public function itemMutations(Request $request, StoreItem $storeItem): JsonResponse
    {
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $insBefore = $dateFrom
            ? (int) StoreReceiving::where('item_id', $storeItem->id)->whereDate('receipt_date', '<', $dateFrom)->sum('qty_received')
            : 0;

        $outsBefore = $dateFrom
            ? (int) StoreRequest::where('item_id', $storeItem->id)->where('status', 'fulfilled')->whereDate('request_date', '<', $dateFrom)->sum(DB::raw('COALESCE(qty_approved, qty_requested)'))
            : 0;

        $adjBefore = $dateFrom
            ? (int) StoreStockAdjustment::where('item_id', $storeItem->id)->where('status', 'approved')->whereDate('created_at', '<', $dateFrom)->sum('qty')
            : 0;

        $insQuery = StoreReceiving::where('item_id', $storeItem->id);
        if ($dateFrom) {
            $insQuery->whereDate('receipt_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $insQuery->whereDate('receipt_date', '<=', $dateTo);
        }
        $insInRange = (int) $insQuery->sum('qty_received');

        $outsQuery = StoreRequest::where('item_id', $storeItem->id)->where('status', 'fulfilled');
        if ($dateFrom) {
            $outsQuery->whereDate('request_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $outsQuery->whereDate('request_date', '<=', $dateTo);
        }
        $outsInRange = (int) $outsQuery->sum(DB::raw('COALESCE(qty_approved, qty_requested)'));

        $adjQuery = StoreStockAdjustment::where('item_id', $storeItem->id)->where('status', 'approved');
        if ($dateFrom) {
            $adjQuery->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $adjQuery->whereDate('created_at', '<=', $dateTo);
        }
        $adjInRange = (int) $adjQuery->sum('qty');

        $beginningBalance = $insBefore - $outsBefore + $adjBefore;
        $endingBalance = $beginningBalance + $insInRange - $outsInRange + $adjInRange;

        $ins = StoreReceiving::where('item_id', $storeItem->id)
            ->with('creator:id,name');
        if ($dateFrom) {
            $ins->whereDate('receipt_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $ins->whereDate('receipt_date', '<=', $dateTo);
        }
        $ins = $ins->get()->map(fn ($r) => [
            'type' => 'in',
            'qty' => $r->qty_received,
            'date' => $r->receipt_date,
            'reference' => $r->reference,
            'notes' => $r->notes,
            'by' => $r->creator?->name,
        ]);

        $outs = StoreRequest::where('item_id', $storeItem->id)
            ->where('status', 'fulfilled')
            ->with('requester:id,name');
        if ($dateFrom) {
            $outs->whereDate('request_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $outs->whereDate('request_date', '<=', $dateTo);
        }
        $outs = $outs->get()->map(fn ($r) => [
            'type' => 'out',
            'qty' => $r->qty_approved ?? $r->qty_requested,
            'date' => $r->request_date,
            'reference' => $r->work_order_id ? 'WO #'.$r->work_order_id : null,
            'notes' => $r->notes,
            'by' => $r->requester?->name,
        ]);

        $adj = StoreStockAdjustment::where('item_id', $storeItem->id)
            ->where('status', 'approved')
            ->with('requester:id,name');
        if ($dateFrom) {
            $adj->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $adj->whereDate('created_at', '<=', $dateTo);
        }
        $adj = $adj->get()->map(fn ($a) => [
            'type' => $a->qty > 0 ? 'in' : 'out',
            'qty' => abs($a->qty),
            'date' => $a->created_at->format('Y-m-d'),
            'reference' => 'Adjustment',
            'notes' => $a->reason,
            'by' => $a->requester?->name,
        ]);

        $mutations = $ins->concat($outs)->concat($adj)->sortByDesc('date')->values();

        return response()->json([
            'mutations' => $mutations,
            'beginningBalance' => $beginningBalance,
            'endingBalance' => $endingBalance,
            'item' => ['id' => $storeItem->id, 'name' => $storeItem->name, 'unit' => $storeItem->unit, 'stock' => $storeItem->stock],
        ]);
    }

    public function createReceiving(): Response
    {
        $items = StoreItem::orderBy('name')->get(['id', 'name', 'unit']);

        return Inertia::render('Store/Receivings/Create', ['items' => $items]);
    }

    public function storeReceiving(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $validated = $request->validate([
            'item_id' => 'required|exists:store_items,id',
            'qty_received' => 'required|integer|min:1',
            'unit_price' => 'nullable|numeric|min:0',
            'receipt_date' => 'required|date',
            'reference' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:1000',
        ]);

        $validated['created_by'] = $request->user()->id;

        $receiving = StoreReceiving::create($validated);

        $receiving->item->increment('stock', $validated['qty_received']);

        return redirect('/store')->with('success', 'Receiving recorded.');
    }

    public function createRequest(): Response
    {
        $items = StoreItem::where('stock', '>', 0)->orderBy('name')->get(['id', 'name', 'unit', 'stock']);
        $workOrders = WorkOrder::where('requester_id', request()->user()->id)
            ->orWhereHas('technicianAssignments', fn ($q) => $q->where('technician_id', request()->user()->id))
            ->select('id', 'title')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return Inertia::render('Store/Requests/Create', [
            'items' => $items,
            'workOrders' => $workOrders,
        ]);
    }

    public function storeRequest(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'item_id' => 'required|exists:store_items,id',
            'work_order_id' => 'nullable|exists:work_orders,id',
            'qty_requested' => 'required|integer|min:1',
            'request_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $validated['requested_by'] = $request->user()->id;
        $validated['status'] = 'pending';

        $storeRequest = StoreRequest::create($validated);

        $item = StoreItem::find($validated['item_id']);
        $notif = app(NotificationService::class);
        User::role('chief-engineer')->each(fn ($ce) => $notif->send($ce, 'store_request_submitted', [
            'request_id' => $storeRequest->id,
            'item_name' => $item?->name ?? 'Unknown',
            'qty' => $validated['qty_requested'],
            'requested_by' => $request->user()->name,
        ]));

        return redirect('/store')->with('success', 'Request submitted.');
    }

    public function myRequests(Request $request): Response
    {
        $requests = StoreRequest::with([
            'item:id,name,unit',
            'workOrder:id,title',
            'approver:id,name',
        ])
            ->where('requested_by', $request->user()->id)
            ->orderByDesc('created_at')
            ->paginate(20);

        return Inertia::render('Store/Requests/MyRequests', ['requests' => $requests]);
    }

    public function approveRequest(Request $request, StoreRequest $storeRequest): RedirectResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);
        abort_if($storeRequest->status !== 'pending', 422);

        $validated = $request->validate([
            'qty_approved' => 'required|integer|min:1|max:'.$storeRequest->qty_requested,
        ]);

        $storeRequest->update([
            'qty_approved' => $validated['qty_approved'],
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        if ($storeRequest->requester) {
            app(NotificationService::class)->send($storeRequest->requester, 'store_request_approved', [
                'request_id' => $storeRequest->id,
                'item_name' => $storeRequest->item?->name ?? 'Unknown',
                'qty' => $storeRequest->qty_requested,
                'qty_approved' => $validated['qty_approved'],
                'approved_by' => $request->user()->name,
            ]);
        }

        return redirect('/store')->with('success', 'Request approved.');
    }

    public function fulfillRequest(Request $request, StoreRequest $storeRequest): RedirectResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);
        abort_if($storeRequest->status !== 'approved', 422);

        $qty = $storeRequest->qty_approved ?? $storeRequest->qty_requested;
        $item = $storeRequest->item;

        if ($item->stock < $qty) {
            return redirect('/store')->with('error', 'Insufficient stock.');
        }

        $item->decrement('stock', $qty);

        $storeRequest->update(['status' => 'fulfilled']);

        if ($storeRequest->requester) {
            app(NotificationService::class)->send($storeRequest->requester, 'store_request_fulfilled', [
                'request_id' => $storeRequest->id,
                'item_name' => $storeRequest->item?->name ?? 'Unknown',
                'qty' => $qty,
                'fulfilled_by' => $request->user()->name,
            ]);
        }

        return redirect('/store')->with('success', 'Request fulfilled.');
    }

    public function rejectRequest(Request $request, StoreRequest $storeRequest): RedirectResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);
        abort_if($storeRequest->status !== 'pending', 422);

        $storeRequest->update([
            'status' => 'rejected',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        if ($storeRequest->requester) {
            app(NotificationService::class)->send($storeRequest->requester, 'store_request_rejected', [
                'request_id' => $storeRequest->id,
                'item_name' => $storeRequest->item?->name ?? 'Unknown',
                'qty' => $storeRequest->qty_requested,
                'rejected_by' => $request->user()->name,
            ]);
        }

        return redirect('/store')->with('success', 'Request rejected.');
    }

    public function adjustments(): Response
    {
        $adjustments = StoreStockAdjustment::with(['item:id,name,unit', 'requester:id,name', 'approver:id,name'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return Inertia::render('Store/Adjustments', [
            'adjustments' => $adjustments,
        ]);
    }

    public function storeAdjustment(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('manage projects'), 403);

        $validated = $request->validate([
            'item_id' => 'required|exists:store_items,id',
            'qty' => 'required|integer|not_in:0',
            'reason' => 'nullable|string|max:1000',
        ]);

        $validated['requested_by'] = $request->user()->id;
        $validated['status'] = 'pending';

        StoreStockAdjustment::create($validated);

        $item = StoreItem::find($validated['item_id']);
        $sign = $validated['qty'] > 0 ? '+' : '';
        $notif = app(NotificationService::class);
        User::role('chief-engineer')->each(fn ($ce) => $notif->send($ce, 'stock_adjustment_submitted', [
            'item_name' => $item?->name ?? 'Unknown',
            'qty' => $sign.$validated['qty'],
            'reason' => $validated['reason'] ?? 'No reason given',
            'submitted_by' => $request->user()->name,
        ]));

        return redirect('/store')->with('success', 'Adjustment submitted for approval.');
    }

    public function approveAdjustment(StoreStockAdjustment $storeStockAdjustment): RedirectResponse
    {
        $user = request()->user();
        abort_unless($user->hasRole('chief-engineer'), 403);
        abort_if($storeStockAdjustment->status !== 'pending', 422);

        $qty = $storeStockAdjustment->qty;
        $item = $storeStockAdjustment->item;

        if ($qty > 0) {
            $item->increment('stock', $qty);
        } else {
            $abs = abs($qty);
            if ($item->stock < $abs) {
                return redirect('/store')->with('error', 'Insufficient stock to reduce.');
            }
            $item->decrement('stock', $abs);
        }

        $storeStockAdjustment->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        if ($storeStockAdjustment->requester) {
            app(NotificationService::class)->send($storeStockAdjustment->requester, 'stock_adjustment_approved', [
                'item_name' => $storeStockAdjustment->item?->name ?? 'Unknown',
                'qty' => ($storeStockAdjustment->qty > 0 ? '+' : '').$storeStockAdjustment->qty,
                'approved_by' => $user->name,
            ]);
        }

        return redirect('/store')->with('success', 'Adjustment approved.');
    }

    public function rejectAdjustment(StoreStockAdjustment $storeStockAdjustment): RedirectResponse
    {
        $user = request()->user();
        abort_unless($user->hasRole('chief-engineer'), 403);
        abort_if($storeStockAdjustment->status !== 'pending', 422);

        $storeStockAdjustment->update([
            'status' => 'rejected',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        if ($storeStockAdjustment->requester) {
            app(NotificationService::class)->send($storeStockAdjustment->requester, 'stock_adjustment_rejected', [
                'item_name' => $storeStockAdjustment->item?->name ?? 'Unknown',
                'qty' => ($storeStockAdjustment->qty > 0 ? '+' : '').$storeStockAdjustment->qty,
                'rejected_by' => $user->name,
            ]);
        }

        return redirect('/store')->with('success', 'Adjustment rejected.');
    }
}
