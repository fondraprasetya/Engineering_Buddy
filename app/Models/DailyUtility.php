<?php

namespace App\Models;
use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyUtility extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'record_date', 'type', 'consumption', 'unit',
        'beginning_stand', 'ending_stand',
        'cost', 'notes', 'photo', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'record_date' => 'date',
            'consumption' => 'decimal:2',
            'beginning_stand' => 'decimal:2',
            'ending_stand' => 'decimal:2',
            'cost' => 'decimal:2',
        ];
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
