<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supplier_payments', function (Blueprint $table) {
            // حذف القيد القديم
            $table->dropForeign(['purchase_id']);
            
            // إضافة القيد الجديد بدون أي action (نتعامل يدوياً في الكود)
            $table->foreign('purchase_id')
                ->references('id')
                ->on('purchases')
                ->onDelete('restrict'); // منع الحذف إلا إذا تم التعامل معه يدوياً
        });
    }

    public function down(): void
    {
        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->dropForeign(['purchase_id']);
            
            $table->foreign('purchase_id')
                ->references('id')
                ->on('purchases')
                ->nullOnDelete();
        });
    }
};
