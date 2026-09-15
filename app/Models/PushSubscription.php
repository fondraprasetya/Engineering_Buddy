<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class PushSubscription extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'user_id', 'tenant_id', 'endpoint', 'p256dh', 'auth', 'user_agent',
    ];
}
