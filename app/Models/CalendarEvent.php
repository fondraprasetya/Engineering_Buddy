<?php

namespace App\Models;
use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarEvent extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'start_datetime',
        'end_datetime',
        'all_day',
        'color',
        'venue',
        'type',
        'room_occupied',
        'guest_count',
        'restaurant_customer_count',
        'meeting_customer_count',
        'room_available',
        'file_path',
        'mtd_room_occupied',
        'mtd_room_available',
        'mtd_guest_count',
        'mtd_restaurant_customer_count',
        'mtd_mice_customer',
        'pax',
    ];

    protected function casts(): array
    {
        return [
            'start_datetime' => 'datetime:Y-m-d\TH:i:s',
            'end_datetime' => 'datetime:Y-m-d\TH:i:s',
            'all_day' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path ? asset('storage/'.$this->file_path) : null;
    }

    protected $appends = ['file_url'];
}
