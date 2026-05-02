<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('customer_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->change();
        });

        // نقل customer_id من الفاتورة إلى الدفعة لكل السجلات الموجودة
        DB::statement('
            UPDATE payments p
            JOIN invoices i ON p.invoice_id = i.id
            SET p.customer_id = i.customer_id
        ');
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropColumn('customer_id');
            $table->foreignId('invoice_id')->nullable(false)->change();
        });
    }
};
