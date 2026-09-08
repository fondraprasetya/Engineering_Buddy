<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_milestones', function (Blueprint $table) {
            $table->json('photos')->nullable()->after('status');
        });

        DB::table('project_milestones')->whereNotNull('photo')->get()->each(function ($row) {
            DB::table('project_milestones')
                ->where('id', $row->id)
                ->update(['photos' => json_encode([$row->photo])]);
        });

        Schema::table('project_milestones', function (Blueprint $table) {
            $table->dropColumn('photo');
        });
    }

    public function down(): void
    {
        Schema::table('project_milestones', function (Blueprint $table) {
            $table->string('photo')->nullable()->after('status');
        });

        DB::table('project_milestones')->whereNotNull('photos')->get()->each(function ($row) {
            $photos = json_decode($row->photos ?? '[]', true);
            DB::table('project_milestones')
                ->where('id', $row->id)
                ->update(['photo' => $photos[0] ?? null]);
        });

        Schema::table('project_milestones', function (Blueprint $table) {
            $table->dropColumn('photos');
        });
    }
};
