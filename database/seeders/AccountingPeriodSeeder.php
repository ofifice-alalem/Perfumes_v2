<?php

namespace Database\Seeders;

use App\Models\AccountingPeriod;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AccountingPeriodSeeder extends Seeder
{
    public function run(): void
    {
        if (AccountingPeriod::exists()) {
            return;
        }

        // 1. البحث عن أقدم تاريخ حركة موجود في قاعدة البيانات
        $tables = ['invoices', 'purchases', 'payments', 'supplier_payments', 'waste_logs'];
        $earliestDates = [];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                $minDate = DB::table($table)->min('created_at');
                if ($minDate) {
                    $earliestDates[] = Carbon::parse($minDate);
                }
            }
        }

        // 2. إذا وجدت حركات، نبدأ قبل أقدم حركة بيوم كامل، وإلا نبدأ من بداية السنة الحالية
        if (!empty($earliestDates)) {
            $earliest = min($earliestDates);
            $startedAt = $earliest->copy()->subDay()->startOfDay();
        } else {
            $startedAt = now()->startOfYear();
        }

        $admin = User::first();

        // 3. إنشاء الفترة المحاسبية الأولى
        $period = AccountingPeriod::create([
            'name'       => $startedAt->format('Y'),
            'started_at' => $startedAt,
            'status'     => 'open',
            'created_by' => $admin?->id ?? 1,
        ]);

        // 4. ربط أي سجلات سابقة لا تملك period_id بهذه الفترة تلقائياً
        $dailyTables = [
            'invoices', 'invoice_items', 'payments', 'settlements',
            'purchases', 'purchase_items', 'supplier_payments', 'supplier_settlements',
            'invoice_returns', 'invoice_return_items',
            'purchase_returns', 'purchase_return_items',
            'waste_logs', 'waste_items',
        ];

        foreach ($dailyTables as $tbl) {
            if (Schema::hasTable($tbl) && Schema::hasColumn($tbl, 'period_id')) {
                DB::table($tbl)->whereNull('period_id')->update(['period_id' => $period->id]);
            }
        }
    }
}
