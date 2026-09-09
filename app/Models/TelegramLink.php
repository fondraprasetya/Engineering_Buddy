<?php

namespace App\Models;
use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramLink extends Model
{
    use BelongsToTenant;

    protected $fillable = ['user_id', 'chat_id', 'linked_at', 'link_code', 'link_code_expires_at'];

    protected function casts(): array
    {
        return [
            'linked_at' => 'datetime',
            'link_code_expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
