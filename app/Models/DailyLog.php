<?php

namespace App\Models;
use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyLog extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'technician_id', 'work_order_id', 'log_date',
        'activities', 'hours_worked', 'issues_found',
    ];

    protected function casts(): array
    {
        return [
            'log_date' => 'date',
            'hours_worked' => 'decimal:1',
        ];
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }
}
