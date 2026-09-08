<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChecklistResponse extends Model
{
    protected $fillable = ['work_order_id', 'field_id', 'value'];

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function field(): BelongsTo
    {
        return $this->belongsTo(ChecklistField::class, 'field_id');
    }
}
