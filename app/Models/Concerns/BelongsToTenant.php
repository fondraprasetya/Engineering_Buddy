<?php

namespace App\Models\Concerns;

use App\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Scope a model to the current tenant.
 * - Adds a global scope that filters by tenant_id when a tenant context is set.
 * - Auto-fills tenant_id on create from the current context.
 * Use ->withoutTenant() to bypass the scope (e.g. auth, internal lookups).
 */
trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            if (TenantContext::id() !== null) {
                $builder->where($builder->getModel()->getTable().'.tenant_id', TenantContext::id());
            }
        });

        static::creating(function (Model $model) {
            if (TenantContext::id() !== null && empty($model->tenant_id)) {
                $model->tenant_id = TenantContext::id();
            }
        });
    }

    public function scopeWithoutTenant(Builder $query): Builder
    {
        return $query->withoutGlobalScope('tenant');
    }
}
