<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'create work orders',
            'approve dept head',
            'approve chief engineer',
            'assign technician',
            'update task status',
            'manage assets',
            'manage checklist templates',
            'manage maintenance schedules',
            'manage projects',
            'view asset history',
            'manage users',
            'manage locations',
            'view org dashboards',
            'approve roster',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission);
        }

        $employee = Role::findOrCreate('employee');
        $employee->syncPermissions(['create work orders']);

        $deptHead = Role::findOrCreate('dept-head');
        $deptHead->syncPermissions(['create work orders', 'approve dept head', 'update task status']);

        $technician = Role::findOrCreate('technician');
        $technician->syncPermissions(['create work orders', 'update task status']);

        $engAdmin = Role::findOrCreate('eng-admin');
        $engAdmin->syncPermissions([
            'create work orders', 'assign technician', 'update task status',
            'manage assets', 'manage checklist templates', 'manage maintenance schedules',
            'manage projects', 'view asset history', 'manage users', 'manage locations', 'view org dashboards',
        ]);

        $chiefEngineer = Role::findOrCreate('chief-engineer');
        $chiefEngineer->syncPermissions([
            'create work orders', 'approve chief engineer', 'approve roster',
            'assign technician', 'update task status', 'manage assets',
            'manage checklist templates', 'manage maintenance schedules',
            'manage projects', 'view asset history', 'manage locations',
            'view org dashboards',
        ]);

        $gm = Role::findOrCreate('gm');
        $gm->syncPermissions(['view asset history', 'view org dashboards']);

        $superAdmin = Role::findOrCreate('super-admin');
        $superAdmin->syncPermissions(Permission::all());
    }
}
