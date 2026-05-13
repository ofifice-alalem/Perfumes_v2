<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use App\Models\User;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\PaymentMethod;
use App\Models\Category;
use App\Models\AccountingPeriod;

class StartOperationSeeder extends Seeder
{
    public function run(): void
    {
        // ─── 1. الأدوار ───────────────────────────────────────────────────────
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (['super-admin', 'admin', 'saler', 'cashier'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        // ─── 2. المستخدمون ────────────────────────────────────────────────────
        $superAdmin = User::firstOrCreate(
            ['username' => 'admin'],
            [
                'name'     => 'Super Admin',
                'email'    => 'admin@perfumes.local',
                'password' => Hash::make('password'),
            ]
        );
        $superAdmin->syncRoles(['super-admin']);

        $admin = User::firstOrCreate(
            ['username' => 'manager'],
            [
                'name'     => 'Admin',
                'email'    => 'manager@perfumes.local',
                'password' => Hash::make('password'),
            ]
        );
        $admin->syncRoles(['admin']);

        // ─── 3. الزبون النقدي (id=1 إلزامي) ──────────────────────────────────
        Customer::firstOrCreate(
            ['id' => 1],
            ['name' => 'زبون نقدي', 'is_active' => true]
        );

        // ─── 4. المورد النقدي (id=1 إلزامي) ──────────────────────────────────
        Supplier::firstOrCreate(
            ['id' => 1],
            ['name' => 'مورد نقدي', 'phone' => '0000000000', 'is_active' => true]
        );

        // ─── 5. وسائل الدفع ───────────────────────────────────────────────────
        foreach (['نقدي', 'بطاقة', 'تحويل بنكي'] as $method) {
            PaymentMethod::firstOrCreate(['name' => $method], ['is_active' => true]);
        }

        // ─── 6. التصنيفات ─────────────────────────────────────────────────────
        $categories = [
            ['name' => 'عطور زيتية',       'unit' => 'ml',  'is_operational' => false],
            ['name' => 'عطور أصلية',       'unit' => 'ml',  'is_operational' => false],
            ['name' => 'بخور',              'unit' => 'pcs', 'is_operational' => false],
            ['name' => 'وشق',               'unit' => 'g',   'is_operational' => false],
            ['name' => 'منتجات',            'unit' => 'pcs', 'is_operational' => false],
            ['name' => 'بادي لاوشن',        'unit' => 'ml',  'is_operational' => false],
            ['name' => 'مستلزمات تشغيلية', 'unit' => 'pcs', 'is_operational' => true],
        ];
        foreach ($categories as $cat) {
            Category::firstOrCreate(['name' => $cat['name']], $cat);
        }

        // ─── 7. الفترة المحاسبية (إلزامية — PeriodObserver يعتمد عليها) ──────
        if (! AccountingPeriod::exists()) {
            AccountingPeriod::create([
                'name'       => date('Y'),
                'started_at' => now(),
                'status'     => 'open',
                'created_by' => $superAdmin->id,
            ]);
        }
    }
}
