<?php

namespace App\Models;
use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Asset extends Model
{
    use BelongsToTenant;

    protected $fillable = ['name', 'code', 'category', 'location_id', 'status', 'photo', 'acquisition_cost', 'acquisition_date'];

    protected function casts(): array
    {
        return [
            'acquisition_cost' => 'decimal:2',
            'acquisition_date' => 'date',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class);
    }

    public function maintenanceSchedules(): HasMany
    {
        return $this->hasMany(MaintenanceSchedule::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }
}
