<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChecklistField;
use App\Models\ChecklistTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ChecklistTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage checklist templates'), 403);

        return response()->json(
            ChecklistTemplate::with('fields')
                ->where('is_archived', false)
                ->latest()
                ->paginate(20)
        );
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage checklist templates'), 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'asset_category' => 'nullable|string|max:100',
            'fields' => 'required|array|min:1',
            'fields.*.label' => 'required|string|max:255',
            'fields.*.field_type' => 'required|in:label,checkbox,text,number,photo,date',
            'fields.*.required' => 'boolean',
            'fields.*.sort_order' => 'integer|min:0',
            'fields.*.page' => 'integer|min:1',
            'fields.*.x' => 'integer',
            'fields.*.y' => 'integer',
            'fields.*.width' => 'integer|min:50|max:600',
            'fields.*.photo' => 'nullable|string|max:10000000',
        ]);

        $template = ChecklistTemplate::create([
            'name' => $validated['name'],
            'asset_category' => $validated['asset_category'] ?? null,
            'created_by' => $request->user()->id,
            'is_archived' => false,
        ]);

        foreach ($validated['fields'] as $i => $field) {
            ChecklistField::create([
                'template_id' => $template->id,
                'label' => $field['label'],
                'field_type' => $field['field_type'],
                'required' => $field['required'] ?? false,
                'sort_order' => $field['sort_order'] ?? $i,
                'page' => $field['page'] ?? 1,
                'x' => $field['x'] ?? 20,
                'y' => $field['y'] ?? ($i * 80),
                'width' => $field['width'] ?? 280,
                'photo' => ChecklistField::storePhoto($field['photo'] ?? null),
            ]);
        }

        return response()->json($template->load('fields'), 201);
    }

    public function show(ChecklistTemplate $checklistTemplate): JsonResponse
    {
        return response()->json($checklistTemplate->load('fields'));
    }

    public function update(Request $request, ChecklistTemplate $checklistTemplate): JsonResponse
    {
        abort_unless($request->user()->can('manage checklist templates'), 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'asset_category' => 'nullable|string|max:100',
            'fields' => 'required|array|min:1',
            'fields.*.label' => 'required|string|max:255',
            'fields.*.field_type' => 'required|in:label,checkbox,text,number,photo,date',
            'fields.*.required' => 'boolean',
            'fields.*.sort_order' => 'integer|min:0',
            'fields.*.page' => 'integer|min:1',
            'fields.*.x' => 'integer',
            'fields.*.y' => 'integer',
            'fields.*.width' => 'integer|min:50|max:600',
            'fields.*.photo' => 'nullable|string|max:10000000',
        ]);

        $oldPhotos = $checklistTemplate->fields()->pluck('photo')->filter()->values();

        $checklistTemplate->update([
            'name' => $validated['name'],
            'asset_category' => $validated['asset_category'] ?? null,
        ]);

        $checklistTemplate->fields()->delete();

        foreach ($validated['fields'] as $i => $field) {
            ChecklistField::create([
                'template_id' => $checklistTemplate->id,
                'label' => $field['label'],
                'field_type' => $field['field_type'],
                'required' => $field['required'] ?? false,
                'sort_order' => $field['sort_order'] ?? $i,
                'page' => $field['page'] ?? 1,
                'x' => $field['x'] ?? 20,
                'y' => $field['y'] ?? ($i * 80),
                'width' => $field['width'] ?? 280,
                'photo' => ChecklistField::storePhoto($field['photo'] ?? null),
            ]);
        }

        $keptPhotos = $checklistTemplate->fields()->pluck('photo')->filter();

        Storage::disk('public')->delete($oldPhotos->diff($keptPhotos)->values()->all());

        return response()->json($checklistTemplate->fresh()->load('fields'));
    }

    public function archive(Request $request, ChecklistTemplate $checklistTemplate): JsonResponse
    {
        abort_unless($request->user()->can('manage checklist templates'), 403);

        $checklistTemplate->update(['is_archived' => true]);

        return response()->json(['message' => 'Template archived.']);
    }
}
