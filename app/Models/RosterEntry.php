<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RosterEntry extends Model
{
    protected $fillable = ['user_id', 'date', 'shift', 'time_blocks', 'notes', 'created_by'];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'time_blocks' => 'array',
            'approved_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function scopeApproved($q)
    {
        $q->whereNotNull('approved_at');
    }

    public function scopePending($q)
    {
        $q->whereNull('approved_at');
    }

    public function isApproved(): bool
    {
        return $this->approved_at !== null;
    }
}
