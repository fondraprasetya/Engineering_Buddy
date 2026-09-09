<?php

namespace App\Models;
use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActualExpense extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'expense_date', 'post_account', 'amount', 'description',
        'document_ref', 'status',
        'work_order_id', 'project_id', 'maintenance_schedule_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'expense_date' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function maintenanceSchedule(): BelongsTo
    {
        return $this->belongsTo(MaintenanceSchedule::class);
    }
}
