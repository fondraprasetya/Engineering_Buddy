<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_receivings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('store_items')->cascadeOnDelete();
            $table->integer('qty_received');
            $table->decimal('unit_price', 15, 2)->nullable();
            $table->date('receipt_date');
            $table->string('reference', 100)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_receivings');
    }
};
