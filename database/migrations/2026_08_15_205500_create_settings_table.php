<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Insert initial default store and receipt settings
        DB::table('settings')->insert([
            [
                'key' => 'store_name',
                'value' => 'تاجوري للعطور الفاخرة',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'store_subname',
                'value' => 'TAJORI PERFUMES & ESSENCES',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'store_details',
                'value' => "طرابلس - شارع الجرابة (مقابل مجمع الذهب)\nهاتف: 091-2345678 / 092-8765432",
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'store_logo',
                'value' => '/images/logo-black_white.png',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'thank_you_message',
                'value' => '✨ شكراً لزيارتكم! نتمنى لكم يوماً معطراً ✨',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'policy_notes',
                'value' => "• البضاعة المباعة (العطور الأصلية والعبوات) تستبدل خلال 3 أيام بشرط وجود الفاتورة الأصلية وأن تكون بحالتها الأولى.\n• ⚠️ العطور التقسيم والزيوت العطرية المعبأة لا ترد ولا تستبدل لدواعي السلامة وصحة العامة.",
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
