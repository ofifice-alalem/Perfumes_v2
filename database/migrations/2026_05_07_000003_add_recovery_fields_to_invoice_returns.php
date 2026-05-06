<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('invoice_returns', function (Blueprint $table) {
            $table->decimal('recovered_amount', 10, 2)->default(0)->after('total');
            $table->decimal('due_recovery', 10, 2)->default(0)->after('recovered_amount');
            $table->enum('recovery_status', ['unpaid', 'partial', 'paid'])->default('unpaid')->after('due_recovery');
            
            $table->index('recovery_status');
        });
    }

    public function down(): void
    {
        Schema::table('invoice_returns', function (Blueprint $table) {
            $table->dropIndex(['recovery_status']);
            $table->dropColumn(['recovered_amount', 'due_recovery', 'recovery_status']);
        });
    }
};
