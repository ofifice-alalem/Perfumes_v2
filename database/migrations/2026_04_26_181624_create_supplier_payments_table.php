<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_id')->constrained()->restrictOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('purchase_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_payments');
    }
};
