<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $tables = [
            'invoices', 'invoice_items', 'payments', 'settlements',
            'purchases', 'purchase_items', 'supplier_payments', 'supplier_settlements',
            'invoice_returns', 'invoice_return_items',
            'purchase_returns', 'purchase_return_items',
            'waste_logs', 'waste_items',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->unsignedBigInteger('period_id')->nullable()->after('id');
                $t->index('period_id');
            });
        }
    }

    public function down(): void
    {
        $tables = [
            'invoices', 'invoice_items', 'payments', 'settlements',
            'purchases', 'purchase_items', 'supplier_payments', 'supplier_settlements',
            'invoice_returns', 'invoice_return_items',
            'purchase_returns', 'purchase_return_items',
            'waste_logs', 'waste_items',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $t) use ($table) {
                $t->dropIndex(["{$table}_period_id_index"]);
                $t->dropColumn('period_id');
            });
        }
    }
};
