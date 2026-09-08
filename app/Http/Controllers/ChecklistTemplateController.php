<?php

namespace App\Http\Controllers;

use App\Models\ChecklistField;
use App\Models\ChecklistTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ChecklistTemplateController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->can('manage checklist templates'), 403);

        $templates = ChecklistTemplate::with('fields')
            ->where('is_archived', false)
            ->latest()
            ->paginate(20);

        return Inertia::render('ChecklistTemplates/Index', ['templates' => $templates]);
    }

    public function create()
    {
        return Inertia::render('ChecklistTemplates/Create');
    }

    public function store(Request $request)
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

        return redirect('/checklist-templates')->with('success', 'Template created.');
    }

    public function show(ChecklistTemplate $checklistTemplate)
    {
        return Inertia::render('ChecklistTemplates/Show', [
            'template' => $checklistTemplate->load('fields'),
        ]);
    }

    public function edit(ChecklistTemplate $checklistTemplate)
    {
        abort_unless(request()->user()->can('manage checklist templates'), 403);

        return Inertia::render('ChecklistTemplates/Edit', [
            'template' => $checklistTemplate->load('fields'),
        ]);
    }

    public function update(Request $request, ChecklistTemplate $checklistTemplate)
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

        return redirect('/checklist-templates')->with('success', 'Template updated.');
    }

    public function destroy(Request $request, ChecklistTemplate $checklistTemplate)
    {
        abort_unless($request->user()->can('manage checklist templates'), 403);

        $checklistTemplate->delete();

        return redirect('/checklist-templates')->with('success', 'Template deleted.');
    }

    public function duplicate(Request $request, ChecklistTemplate $checklistTemplate)
    {
        abort_unless($request->user()->can('manage checklist templates'), 403);

        $copy = ChecklistTemplate::create([
            'name' => $checklistTemplate->name.' (Copy)',
            'asset_category' => $checklistTemplate->asset_category,
            'created_by' => $request->user()->id,
            'is_archived' => false,
        ]);

        foreach ($checklistTemplate->fields as $field) {
            $photo = $field->photo;
            if ($photo && Storage::disk('public')->exists($photo)) {
                $extension = pathinfo($photo, PATHINFO_EXTENSION);
                $newPath = 'checklist-photos/'.Str::uuid()->toString().'.'.$extension;
                Storage::disk('public')->copy($photo, $newPath);
                $photo = $newPath;
            }

            ChecklistField::create([
                'template_id' => $copy->id,
                'label' => $field->label,
                'field_type' => $field->field_type,
                'required' => $field->required,
                'sort_order' => $field->sort_order,
                'page' => $field->page,
                'x' => $field->x,
                'y' => $field->y,
                'width' => $field->width,
                'photo' => $photo,
            ]);
        }

        return redirect('/checklist-templates')->with('success', 'Template duplicated.');
    }
}
