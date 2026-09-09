<?php

namespace App\Models;
use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreRequest extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'item_id', 'work_order_id', 'requested_by', 'qty_requested', 'qty_approved',
        'status', 'request_date', 'notes', 'approved_by', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'qty_requested' => 'integer',
            'qty_approved' => 'integer',
            'request_date' => 'date',
            'approved_at' => 'datetime',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(StoreItem::class, 'item_id');
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
