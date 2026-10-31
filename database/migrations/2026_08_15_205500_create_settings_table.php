<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('settings')) {
            Schema::create('settings', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique();
                $table->text('value')->nullable();
                $table->timestamps();
            });
        }

        // Insert initial default store and receipt settings
        DB::table('settings')->insertOrIgnore([
            [
                'key' => 'store_name',
                'value' => 'منظومة السحابة',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'store_subname',
                'value' => 'Taqniya Cloud POS',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'store_details',
                'value' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'store_logo',
                'value' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'thank_you_message',
                'value' => '✨ شكراً لزيارتكم! نتشرف بخدمتكم دائماً ✨',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'policy_notes',
                'value' => '• البضاعة المباعة تستبدل أو تسترجع وفقاً للشروط والأحكام الخاصة بالمتجر.',
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
