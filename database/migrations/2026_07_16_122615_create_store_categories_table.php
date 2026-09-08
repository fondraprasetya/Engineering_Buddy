<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['supply', 'tool']);
            $table->timestamps();
        });

        DB::table('store_categories')->insert([
            ['name' => 'General Supplies', 'type' => 'supply'],
            ['name' => 'Electrical', 'type' => 'supply'],
            ['name' => 'Pipes & Fittings', 'type' => 'supply'],
            ['name' => 'Hand Tools', 'type' => 'tool'],
            ['name' => 'Power Tools', 'type' => 'tool'],
            ['name' => 'Safety Equipment', 'type' => 'supply'],
            ['name' => 'Fasteners & Hardware', 'type' => 'supply'],
            ['name' => 'Cleaning Supplies', 'type' => 'supply'],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('store_categories');
    }
};
