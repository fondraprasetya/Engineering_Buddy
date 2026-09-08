<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChecklistResponse;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChecklistResponseController extends Controller
{
    public function store(Request $request, WorkOrder $workOrder): JsonResponse
    {
        abort_unless($request->user()->can('update task status'), 403);

        $validated = $request->validate([
            'responses' => 'required|array',
            'responses.*.field_id' => 'required|exists:checklist_fields,id',
            'responses.*.value' => 'required|string',
        ]);

        foreach ($validated['responses'] as $response) {
            ChecklistResponse::updateOrCreate(
                ['work_order_id' => $workOrder->id, 'field_id' => $response['field_id']],
                ['value' => $response['value']]
            );
        }

        return response()->json($workOrder->load('checklistResponses.field'));
    }

    public function uploadPhoto(Request $request, WorkOrder $workOrder): JsonResponse
    {
        abort_unless($request->user()->can('update task status'), 403);

        $validated = $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        $path = $request->file('photo')->store('checklist-photos', 'public');

        return response()->json(['url' => '/storage/'.$path]);
    }
}
