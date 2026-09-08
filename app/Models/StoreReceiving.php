<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreReceiving extends Model
{
    protected $fillable = [
        'item_id', 'qty_received', 'unit_price', 'receipt_date', 'reference', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'qty_received' => 'integer',
            'unit_price' => 'decimal:2',
            'receipt_date' => 'date',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(StoreItem::class, 'item_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
