<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('telegram_links', function (Blueprint $table) {
            $table->string('link_code', 10)->nullable()->unique();
            $table->timestamp('link_code_expires_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('telegram_links', function (Blueprint $table) {
            $table->dropColumn(['link_code', 'link_code_expires_at']);
        });
    }
};
