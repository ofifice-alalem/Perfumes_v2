<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // 1. Fix started_at of the first period to be before all existing records
        DB::table('accounting_periods')
            ->where('id', 1)
            ->update(['started_at' => '2026-05-05 00:00:00']);

        // 2. Backfill period_id = 1 on all legacy records (NULL = pre-Step-11 data)
        $tables = [
            'invoices', 'invoice_items', 'payments', 'settlements',
            'purchases', 'purchase_items', 'supplier_payments', 'supplier_settlements',
            'invoice_returns', 'invoice_return_items',
            'purchase_returns', 'purchase_return_items',
            'waste_logs', 'waste_items',
        ];

        foreach ($tables as $table) {
            DB::table($table)->whereNull('period_id')->update(['period_id' => 1]);
        }
    }

    public function down(): void
    {
        DB::table('accounting_periods')
            ->where('id', 1)
            ->update(['started_at' => now()]);

        $tables = [
            'invoices', 'invoice_items', 'payments', 'settlements',
            'purchases', 'purchase_items', 'supplier_payments', 'supplier_settlements',
            'invoice_returns', 'invoice_return_items',
            'purchase_returns', 'purchase_return_items',
            'waste_logs', 'waste_items',
        ];

        foreach ($tables as $table) {
            DB::table($table)->where('period_id', 1)->update(['period_id' => null]);
        }
    }
};
