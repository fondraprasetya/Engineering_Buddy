<?php

namespace App\Models;
use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DashboardSetting extends Model
{
    use BelongsToTenant;

    protected $fillable = ['user_id', 'layout', 'hidden'];

    protected function casts(): array
    {
        return [
            'layout' => 'array',
            'hidden' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
