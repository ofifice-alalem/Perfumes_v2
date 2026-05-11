<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('period_snapshot_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('period_snapshots')->cascadeOnDelete();
            $table->enum('type', [
                'customer', 'supplier', 'product_stock', 'payment_method',
                'total_sales', 'total_purchases', 'total_returns_in', 'total_returns_out',
                'total_waste', 'total_paid_in', 'total_paid_out',
                'invoices_count', 'purchases_count', 'new_customers',
            ]);
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('entity_name')->nullable();
            $table->decimal('balance', 15, 2)->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['snapshot_id', 'type']);
            $table->index('entity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('period_snapshot_items');
    }
};
