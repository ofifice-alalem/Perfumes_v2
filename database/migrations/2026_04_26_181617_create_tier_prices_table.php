<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tier_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tier_id')->constrained('price_tiers')->cascadeOnDelete();
            $table->foreignId('size_id')->constrained('sizes')->cascadeOnDelete();
            $table->decimal('price_regular', 10, 2);
            $table->decimal('price_vip', 10, 2);
            $table->timestamps();

            $table->unique(['tier_id', 'size_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tier_prices');
    }
};
