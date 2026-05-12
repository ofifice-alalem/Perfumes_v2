<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('period_snapshot_items', function (Blueprint $table) {
            $table->enum('type', [
                'customer', 'supplier', 'product_stock', 'payment_method',
                'waste_product',
                'total_sales', 'total_purchases', 'total_returns_in', 'total_returns_out',
                'total_waste', 'total_paid_in', 'total_paid_out',
                'invoices_count', 'purchases_count', 'new_customers',
            ])->change();
        });
    }

    public function down(): void
    {
        Schema::table('period_snapshot_items', function (Blueprint $table) {
            $table->enum('type', [
                'customer', 'supplier', 'product_stock', 'payment_method',
                'total_sales', 'total_purchases', 'total_returns_in', 'total_returns_out',
                'total_waste', 'total_paid_in', 'total_paid_out',
                'invoices_count', 'purchases_count', 'new_customers',
            ])->change();
        });
    }
};
