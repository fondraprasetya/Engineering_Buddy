<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceSchedule extends Model
{
    protected $fillable = [
        'title', 'asset_id', 'checklist_template_id', 'frequency_type',
        'frequency_value', 'next_due_date', 'default_technician_id',
        'is_active', 'work_order_id',
    ];

    protected $appends = ['status'];

    protected function casts(): array
    {
        return [
            'next_due_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    protected function status(): Attribute
    {
        return Attribute::get(function () {
            if (! $this->is_active) {
                return 'inactive';
            }

            if ($this->workOrder?->status === 'closed') {
                return 'complete';
            }

            if ($this->next_due_date?->lt(now())) {
                return 'overdue';
            }

            return 'scheduled';
        });
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function checklistTemplate(): BelongsTo
    {
        return $this->belongsTo(ChecklistTemplate::class);
    }

    public function defaultTechnician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'default_technician_id');
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }
}
