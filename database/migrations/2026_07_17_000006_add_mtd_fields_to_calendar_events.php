<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calendar_events', function (Blueprint $table) {
            $table->integer('mtd_room_occupied')->nullable()->after('meeting_customer_count');
            $table->integer('mtd_room_available')->nullable()->after('mtd_room_occupied');
            $table->integer('mtd_guest_count')->nullable()->after('mtd_room_available');
            $table->integer('mtd_restaurant_customer_count')->nullable()->after('mtd_guest_count');
            $table->integer('mtd_mice_customer')->nullable()->after('mtd_restaurant_customer_count');
        });
    }

    public function down(): void
    {
        Schema::table('calendar_events', function (Blueprint $table) {
            $table->dropColumn(['mtd_room_occupied', 'mtd_room_available', 'mtd_guest_count', 'mtd_restaurant_customer_count', 'mtd_mice_customer']);
        });
    }
};
