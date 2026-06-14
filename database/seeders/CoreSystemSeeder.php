<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Customer;
use App\Models\PaymentMethod;

class CoreSystemSeeder extends Seeder
{
    /**
     * هذا الـ Seeder يحتوي فقط على البيانات الثابتة والأساسية التي يحتاجها أي متجر جديد لكي يعمل.
     */
    public function run(): void
    {
        // 1. إنشاء الأدوار والصلاحيات + حساب المدير (Admin)
        $this->call(RolesAndAdminSeeder::class);

        // 2. إنشاء المورد النقدي (الأساسي)
        $this->call(CashSupplierSeeder::class);

        // 3. إنشاء زبون نقدي (الأساسي للعمليات اليومية)
        Customer::firstOrCreate(
            ['id' => 1],
            ['name' => 'زبون نقدي', 'is_active' => true]
        );

        // 4. إنشاء طرق الدفع الأساسية
        $methods = ['نقدي', 'بطاقة', 'تحويل بنكي'];
        foreach ($methods as $method) {
            PaymentMethod::firstOrCreate(['name' => $method], ['is_active' => true]);
        }
    }
}
