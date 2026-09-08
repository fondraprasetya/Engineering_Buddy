<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);

        $depts = collect([
            'Mechanical Engineering',
            'Electrical Engineering',
            'Civil Engineering',
        ])->map(fn ($name) => Department::create(['name' => $name]));

        $users = [
            ['name' => 'Alice Employee',   'email' => 'employee@test.com',       'role' => 'employee',       'dept' => 0],
            ['name' => 'Bob Dept Head',    'email' => 'depthead@test.com',       'role' => 'dept-head',      'dept' => 0],
            ['name' => 'Charlie Tech',     'email' => 'technician@test.com',     'role' => 'technician',     'dept' => 1],
            ['name' => 'Diana Eng Admin',  'email' => 'engadmin@test.com',       'role' => 'eng-admin',      'dept' => 0],
            ['name' => 'Eve Chief Eng',    'email' => 'chiefengineer@test.com',  'role' => 'chief-engineer', 'dept' => 2],
            ['name' => 'Frank GM',         'email' => 'gm@test.com',             'role' => 'gm',             'dept' => 2],
            ['name' => 'Super Admin',      'email' => 'admin@test.com',           'role' => 'super-admin',    'dept' => 0],
        ];

        foreach ($users as $u) {
            $user = User::factory()->create([
                'name' => $u['name'],
                'email' => $u['email'],
                'department_id' => $depts[$u['dept']]->id,
                'password' => bcrypt('password'),
            ]);
            $user->assignRole($u['role']);
        }

        Asset::create(['name' => 'Air Handler Unit 1',  'code' => 'AHU-001', 'category' => 'HVAC']);
        Asset::create(['name' => 'Chiller Plant 2',     'code' => 'CHL-002', 'category' => 'HVAC']);
        Asset::create(['name' => 'Generator Set 3',     'code' => 'GEN-003', 'category' => 'Equipment']);
    }
}
