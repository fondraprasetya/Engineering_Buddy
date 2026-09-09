<?php

namespace App\Models;
use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportLog extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'user_id', 'file_name', 'type', 'status',
        'imported', 'skipped', 'error_message',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
