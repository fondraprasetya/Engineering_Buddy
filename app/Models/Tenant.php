<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    protected $fillable = ['name', 'slug', 'plan', 'status', 'settings'];

    protected $casts = [
        'settings' => 'array',
    ];
}
