<?php

namespace App\Models;
use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StoreCategory extends Model
{
    use BelongsToTenant;

    protected $fillable = ['name', 'type'];

    protected function casts(): array
    {
        return ['type' => 'string'];
    }

    public function items(): HasMany
    {
        return $this->hasMany(StoreItem::class, 'category_id');
    }
}
