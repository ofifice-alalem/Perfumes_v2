<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Add recovery tracking fields to purchase_returns
        Schema::table('purchase_returns', function (Blueprint $table) {
            $table->decimal('recovered_amount', 10, 2)->default(0)->after('total');
            $table->decimal('due_recovery', 10, 2)->default(0)->after('recovered_amount');
            $table->enum('recovery_status', ['unpaid', 'partial', 'paid'])->default('unpaid')->after('due_recovery');
        });

        // Add purchase_return_id to supplier_settlements
        Schema::table('supplier_settlements', function (Blueprint $table) {
            $table->foreignId('purchase_return_id')
                ->nullable()
                ->after('purchase_id')
                ->constrained('purchase_returns')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('supplier_settlements', function (Blueprint $table) {
            $table->dropForeign(['purchase_return_id']);
            $table->dropColumn('purchase_return_id');
        });

        Schema::table('purchase_returns', function (Blueprint $table) {
            $table->dropColumn(['recovered_amount', 'due_recovery', 'recovery_status']);
        });
    }
};
