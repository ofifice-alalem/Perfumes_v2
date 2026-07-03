<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::dropIfExists('period_snapshot_stock_profits');
        Schema::create('period_snapshot_stock_profits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('period_snapshots')->cascadeOnDelete();
            $table->unsignedBigInteger('product_id');
            $table->string('product_name');
            $table->string('category_name')->nullable();
            $table->string('unit')->nullable();
            $table->decimal('stock', 15, 2)->default(0);
            $table->decimal('total_purchased', 15, 2)->nullable();
            $table->decimal('total_sold', 15, 2)->nullable();
            $table->decimal('total_wasted', 15, 2)->nullable();
            $table->decimal('total_return_in', 15, 2)->nullable();
            $table->decimal('avg_return_in_price', 15, 2)->nullable();
            $table->decimal('total_return_out', 15, 2)->nullable();
            $table->decimal('avg_return_out_price', 15, 2)->nullable();
            $table->decimal('net_sale_qty', 15, 2)->nullable();
            $table->decimal('avg_purchase_cost', 15, 2)->nullable();
            $table->decimal('avg_sale_price', 15, 2)->nullable();
            $table->decimal('profit', 15, 2)->nullable();
            $table->index(['snapshot_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('period_snapshot_stock_profits');
    }
};
