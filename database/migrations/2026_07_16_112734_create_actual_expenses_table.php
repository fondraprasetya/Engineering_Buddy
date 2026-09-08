<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('actual_expenses', function (Blueprint $table) {
            $table->id();
            $table->date('expense_date');
            $table->string('post_account', 50)->nullable();
            $table->decimal('amount', 15, 2);
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('expense_date');
            $table->index('post_account');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('actual_expenses');
    }
};
