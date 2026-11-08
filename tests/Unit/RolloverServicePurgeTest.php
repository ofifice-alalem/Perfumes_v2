<?php

namespace Tests\Unit;

use App\Models\AccountingPeriod;
use App\Models\PeriodSnapshot;
use App\Models\User;
use App\Services\RolloverService;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RolloverServicePurgeTest extends TestCase
{
    public function test_cannot_purge_open_period(): void
    {
        $userId = DB::table('users')->insertGetId([
            'name' => 'Admin',
            'username' => 'admin_test',
            'email' => 'admin_test@test.com',
            'password' => bcrypt('password'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $periodId = DB::table('accounting_periods')->insertGetId([
            'name' => 'Period 1',
            'started_at' => now()->subDays(10),
            'status' => 'open',
            'created_by' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $service = app(RolloverService::class);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('لا يمكن حذف بيانات فترة مفتوحة');

        $service->purgePeriod($periodId);
    }

    public function test_cannot_purge_without_snapshot(): void
    {
        $userId = DB::table('users')->insertGetId([
            'name' => 'Admin',
            'username' => 'admin_test2',
            'email' => 'admin_test2@test.com',
            'password' => bcrypt('password'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $periodId = DB::table('accounting_periods')->insertGetId([
            'name' => 'Period 1',
            'started_at' => now()->subDays(10),
            'closed_at' => now(),
            'status' => 'closed',
            'created_by' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $service = app(RolloverService::class);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('لا يوجد Snapshot لهذه الفترة — لا يمكن الحذف');

        $service->purgePeriod($periodId);
    }

    public function test_purge_period_successfully_deletes_records(): void
    {
        $userId = DB::table('users')->insertGetId([
            'name' => 'Admin',
            'username' => 'admin_test3',
            'email' => 'admin_test3@test.com',
            'password' => bcrypt('password'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $periodId = DB::table('accounting_periods')->insertGetId([
            'name' => 'Period 1',
            'started_at' => now()->subDays(10),
            'closed_at' => now(),
            'status' => 'closed',
            'created_by' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('period_snapshots')->insert([
            'period_id' => $periodId,
            'snapshot_at' => now(),
            'created_by' => $userId,
            'created_at' => now(),
        ]);

        // Insert sample customer
        $customerId = DB::table('customers')->insertGetId([
            'name' => 'Test Customer',
            'phone' => '0500000000',
            'opening_balance' => 100,
            'total_debt' => 100,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Insert sample invoice with period_id
        DB::table('invoices')->insert([
            'period_id' => $periodId,
            'customer_id' => $customerId,
            'user_id' => $userId,
            'total' => 250,
            'payment_status' => 'paid',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertEquals(1, DB::table('invoices')->where('period_id', $periodId)->count());

        $service = app(RolloverService::class);
        $service->purgePeriod($periodId);

        // Assert invoices for this period are purged
        $this->assertEquals(0, DB::table('invoices')->where('period_id', $periodId)->count());

        // Snapshot is preserved
        $this->assertEquals(1, DB::table('period_snapshots')->where('period_id', $periodId)->count());
    }

    public function test_start_first_period_creates_period_and_links_all_null_period_id_fields(): void
    {
        $userId = DB::table('users')->insertGetId([
            'name' => 'Admin First',
            'username' => 'admin_first',
            'email' => 'admin_first@test.com',
            'password' => bcrypt('password'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $customerId = DB::table('customers')->insertGetId([
            'name' => 'Pre-period Customer',
            'phone' => '0599999999',
            'opening_balance' => 0,
            'total_debt' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Insert legacy invoices and payments without period_id
        $inv1 = DB::table('invoices')->insertGetId([
            'period_id' => null,
            'customer_id' => $customerId,
            'user_id' => $userId,
            'total' => 100,
            'payment_status' => 'paid',
            'created_at' => now()->subDays(5),
            'updated_at' => now()->subDays(5),
        ]);

        $inv2 = DB::table('invoices')->insertGetId([
            'period_id' => null,
            'customer_id' => $customerId,
            'user_id' => $userId,
            'total' => 200,
            'payment_status' => 'paid',
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subDays(2),
        ]);

        // Verify period_id is currently null
        $this->assertEquals(2, DB::table('invoices')->whereNull('period_id')->count());

        $service = app(RolloverService::class);
        $period = $service->startFirstPeriod('الفترة الأولى 2026', $userId);

        // 1. Verify period was created and is open
        $this->assertNotNull($period->id);
        $this->assertEquals('open', $period->status);
        $this->assertEquals('الفترة الأولى 2026', $period->name);

        // 2. Verify all null period_id fields in daily tables were linked to this period
        $this->assertEquals(0, DB::table('invoices')->whereNull('period_id')->count());
        $this->assertEquals(2, DB::table('invoices')->where('period_id', $period->id)->count());

        // 3. Verify new Invoice model creation automatically gets the active period_id via PeriodObserver
        $newInvoice = \App\Models\Invoice::create([
            'customer_id' => $customerId,
            'user_id' => $userId,
            'total' => 350,
            'payment_status' => 'unpaid',
        ]);

        $this->assertEquals($period->id, $newInvoice->period_id);
    }
}
