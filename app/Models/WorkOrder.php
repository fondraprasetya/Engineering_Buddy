<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkOrder extends Model
{
    protected $fillable = [
        'requester_id', 'asset_id', 'location_id', 'project_id', 'checklist_template_id', 'title', 'description',
        'technician_notes', 'photo', 'completion_photo', 'technician_rating', 'priority', 'status', 'actual_cost', 'completion_target_date', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'actual_cost' => 'decimal:2',
            'completion_target_date' => 'date',
            'technician_rating' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function checklistTemplate(): BelongsTo
    {
        return $this->belongsTo(ChecklistTemplate::class);
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(WorkOrderApproval::class);
    }

    public function checklistResponses(): HasMany
    {
        return $this->hasMany(ChecklistResponse::class);
    }

    public function technicianAssignments(): HasMany
    {
        return $this->hasMany(TechnicianAssignment::class);
    }

    public function dailyLogs(): HasMany
    {
        return $this->hasMany(DailyLog::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(WorkOrderPhoto::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(ActualExpense::class);
    }

    public function syncProjectBudget(): void
    {
        if (! $this->project_id) {
            return;
        }

        $this->project->recalculateBudgetActual();
    }
}
