<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // phone was nullable — we keep it nullable to allow cash customer (id=1) with dummy phone
        // The NOT NULL constraint is enforced at application level via Form Request
        // (cash customer uses '0000000000' as phone)
    }

    public function down(): void {}
};
