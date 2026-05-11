<?php

namespace Database\Seeders;

use App\Models\AccountingPeriod;
use App\Models\User;
use Illuminate\Database\Seeder;

class AccountingPeriodSeeder extends Seeder
{
    public function run(): void
    {
        if (AccountingPeriod::exists()) {
            return;
        }

        $admin = User::first();

        AccountingPeriod::create([
            'name'       => date('Y'),
            'started_at' => now(),
            'status'     => 'open',
            'created_by' => $admin?->id ?? 1,
        ]);
    }
}
