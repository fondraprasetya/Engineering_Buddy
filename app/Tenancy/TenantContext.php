<?php

namespace App\Tenancy;

/**
 * Holds the current tenant for a request/process.
 * Set by the ResolveTenant middleware from the authenticated user's tenant_id.
 * When null (CLI, queue workers, unauthenticated requests) the BelongsToTenant
 * global scope is skipped.
 */
class TenantContext
{
    protected static ?int $tenantId = null;

    public static function set(?int $id): void
    {
        static::$tenantId = $id;
    }

    public static function id(): ?int
    {
        return static::$tenantId;
    }

    public static function clear(): void
    {
        static::$tenantId = null;
    }
}
