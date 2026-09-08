<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TechnicianAssignment extends Model
{
    protected $fillable = ['technician_id', 'work_order_id', 'scheduled_date', 'shift', 'status'];

    protected function casts(): array
    {
        return ['scheduled_date' => 'date'];
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
