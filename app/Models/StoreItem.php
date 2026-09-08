<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StoreItem extends Model
{
    protected $fillable = [
        'category_id', 'name', 'unit', 'stock', 'minimum_stock', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'stock' => 'integer',
            'minimum_stock' => 'integer',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(StoreCategory::class, 'category_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function receivings(): HasMany
    {
        return $this->hasMany(StoreReceiving::class, 'item_id');
    }

    public function requests(): HasMany
    {
        return $this->hasMany(StoreRequest::class, 'item_id');
    }
}
