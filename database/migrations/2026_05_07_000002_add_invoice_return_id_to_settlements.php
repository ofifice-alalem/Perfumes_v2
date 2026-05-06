<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('settlements', function (Blueprint $table) {
            $table->foreignId('invoice_return_id')->nullable()->after('invoice_id')->nullOnDelete()->constrained('invoice_returns');
        });
    }

    public function down(): void
    {
        Schema::table('settlements', function (Blueprint $table) {
            $table->dropForeign(['invoice_return_id']);
            $table->dropColumn('invoice_return_id');
        });
    }
};
