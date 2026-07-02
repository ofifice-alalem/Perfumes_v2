<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::dropIfExists('period_snapshot_daily_profits');
        Schema::create('period_snapshot_daily_profits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('period_snapshots')->cascadeOnDelete();
            $table->date('date');
            $table->decimal('sales', 15, 2)->default(0);
            $table->decimal('returns', 15, 2)->default(0);
            $table->decimal('net_sales', 15, 2)->default(0);
            $table->decimal('profit', 15, 2)->default(0);
            $table->index(['snapshot_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('period_snapshot_daily_profits');
    }
};
