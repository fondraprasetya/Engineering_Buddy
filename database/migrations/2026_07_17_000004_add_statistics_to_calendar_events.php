<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calendar_events', function (Blueprint $table) {
            $table->integer('room_occupied')->nullable()->after('type');
            $table->integer('guest_count')->nullable()->after('room_occupied');
            $table->integer('restaurant_customer_count')->nullable()->after('guest_count');
            $table->integer('meeting_customer_count')->nullable()->after('restaurant_customer_count');
        });
    }

    public function down(): void
    {
        Schema::table('calendar_events', function (Blueprint $table) {
            $table->dropColumn(['room_occupied', 'guest_count', 'restaurant_customer_count', 'meeting_customer_count']);
        });
    }
};
