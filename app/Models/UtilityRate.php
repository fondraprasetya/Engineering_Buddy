<?php

namespace App\Models;
use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class UtilityRate extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'type', 'cost_per_unit', 'unit', 'start_date', 'end_date', 'notes', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'cost_per_unit' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function scopeActiveAt($query, $date)
    {
        return $query->where('is_active', true)
            ->where(function ($q) use ($date) {
                $q->whereNull('start_date')->orWhere('start_date', '<=', $date);
            })
            ->where(function ($q) use ($date) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $date);
            });
    }
}
