<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->decimal('opening_balance', 15, 2)->default(0)->after('total_debt');
        });

        Schema::table('suppliers', function (Blueprint $table) {
            $table->decimal('opening_balance', 15, 2)->default(0)->after('total_debt');
        });
    }

    public function down(): void
    {
        Schema::table('customers', fn($t) => $t->dropColumn('opening_balance'));
        Schema::table('suppliers', fn($t) => $t->dropColumn('opening_balance'));
    }
};
