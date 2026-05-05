<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Supplier;

class CashSupplierSeeder extends Seeder
{
    public function run(): void
    {
        Supplier::firstOrCreate(
            ['id' => 1],
            ['name' => 'مورد نقدي', 'phone' => '0000000000', 'is_active' => true]
        );
    }
}
