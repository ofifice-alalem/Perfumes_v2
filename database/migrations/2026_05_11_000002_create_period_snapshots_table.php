<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('period_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->unique()->constrained('accounting_periods')->cascadeOnDelete();
            $table->timestamp('snapshot_at')->useCurrent();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('period_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('period_snapshots');
    }
};
