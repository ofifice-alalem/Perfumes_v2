<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('waste_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('waste_log_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 10, 2);
            $table->enum('reason', ['broken', 'spilled', 'expired', 'lost', 'other'])->default('other');
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index('waste_log_id');
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waste_items');
    }
};
