<?php

namespace App\Models;
use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectMilestone extends Model
{
    use BelongsToTenant;

    protected $fillable = ['project_id', 'title', 'due_date', 'status', 'photos'];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'photos' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function getPhotoUrlsAttribute(): array
    {
        return array_map(fn ($p) => asset('storage/'.$p), $this->photos ?? []);
    }

    protected $appends = ['photo_urls'];
}
