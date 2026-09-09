<?php

namespace App\Models;
use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreStockAdjustment extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'item_id', 'qty', 'reason', 'status', 'requested_by', 'approved_by', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'integer',
            'approved_at' => 'datetime',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(StoreItem::class, 'item_id');
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
