<?php

namespace App\Models;
use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'name', 'description', 'start_date', 'end_date',
        'budget_planned', 'budget_actual', 'status', 'created_by',
        'budget_items', 'asset_id',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'budget_planned' => 'decimal:2',
            'budget_actual' => 'decimal:2',
            'budget_items' => 'array',
        ];
    }

    public function budgetTotal(): float
    {
        if (! $this->budget_items) {
            return (float) ($this->budget_planned ?? 0);
        }

        return collect($this->budget_items)->sum(fn ($item) => ($item['qty'] ?? 0) * ($item['amount'] ?? 0));
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function milestones(): HasMany
    {
        return $this->hasMany(ProjectMilestone::class);
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(ActualExpense::class);
    }

    public function recalculateBudgetActual(): void
    {
        $total = $this->workOrders()
            ->whereNotNull('actual_cost')
            ->sum('actual_cost');

        $this->updateQuietly(['budget_actual' => $total]);
    }
}
