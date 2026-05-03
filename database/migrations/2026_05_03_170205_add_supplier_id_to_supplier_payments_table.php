<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->foreignId('supplier_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_id')->nullable()->change();
        });

        // نقل supplier_id من فاتورة الشراء إلى الدفعة لكل السجلات الموجودة
        DB::statement('
            UPDATE supplier_payments sp
            JOIN purchases p ON sp.purchase_id = p.id
            SET sp.supplier_id = p.supplier_id
        ');

        // جعل supplier_id إجباري بعد نقل البيانات
        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->foreignId('supplier_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropColumn('supplier_id');
            $table->foreignId('purchase_id')->nullable(false)->change();
        });
    }
};
