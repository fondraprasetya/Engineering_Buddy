<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->boolean('is_event_venue')->default(false)->after('floor_number');
        });

        // Preserve current behaviour: rooms under AR-001 were the venue list.
        $areaId = DB::table('locations')->where('type', 'area')->where('code', 'AR-001')->value('id');
        if ($areaId) {
            DB::table('locations')->where('parent_id', $areaId)->where('type', 'room')->update(['is_event_venue' => true]);
        }
    }

    public function down(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->dropColumn('is_event_venue');
        });
    }
};
