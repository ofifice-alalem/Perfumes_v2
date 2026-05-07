<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Purchases
        Schema::table('purchases', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('supplier_id')->constrained()->nullOnDelete();
        });

        // Invoice Returns
        Schema::table('invoice_returns', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('customer_id')->constrained()->nullOnDelete();
        });

        // Purchase Returns
        Schema::table('purchase_returns', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('supplier_id')->constrained()->nullOnDelete();
        });

        // Supplier Payments
        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('supplier_id')->constrained()->nullOnDelete();
        });

        // Supplier Settlements
        Schema::table('supplier_settlements', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('supplier_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });

        Schema::table('invoice_returns', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });

        Schema::table('purchase_returns', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });

        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });

        Schema::table('supplier_settlements', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
    }
};
