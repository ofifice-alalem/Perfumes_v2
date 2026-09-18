<?php

namespace App\Http\Controllers;

use App\Http\Requests\RolloverRequest;
use App\Repositories\Contracts\AccountingPeriodRepositoryInterface;
use App\Repositories\Contracts\ReportRepositoryInterface;
use App\Services\RolloverService;
use App\Models\AccountingPeriod;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class PeriodController extends Controller
{
    public function __construct(
        private AccountingPeriodRepositoryInterface $periods,
        private RolloverService $rollover,
        private ReportRepositoryInterface $reports,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Periods/Index', [
            'periods'       => $this->periods->paginated(20),
            'currentPeriod' => $this->rollover->getCurrentPeriod(),
        ]);
    }

    public function rollover(): Response
    {
        $current = $this->rollover->getCurrentPeriod();

        abort_unless($current, 404, 'لا توجد فترة مفتوحة');

        $dateFrom = $current->started_at->toDateString();
        $dateTo   = now()->toDateString();

        return Inertia::render('Periods/Rollover', [
            'currentPeriod' => $current,
            'preview'       => $this->rollover->previewSnapshot(),
            'profitSummary' => $this->reports->dailyProfitSummary($dateFrom, $dateTo, null, $current->id),
            'periodDateFrom'=> $dateFrom,
            'periodDateTo'  => $dateTo,
        ]);
    }

    public function execute(RolloverRequest $request): RedirectResponse
    {
        $data = $request->validated();

        try {
            $newPeriod = $this->rollover->executeRollover(
                $data['new_period_name'],
                $data['notes'] ?? null,
            );
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('periods.index')
            ->with('success', "تم التدوير بنجاح. الفترة الجديدة: {$newPeriod->name}");
    }

    public function startFirst(Request $request): RedirectResponse
    {
        $current = $this->rollover->getCurrentPeriod();
        if ($current) {
            return back()->with('error', 'يوجد بالفعل فترة محاسبية مفتوحة.');
        }

        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        return DB::transaction(function () use ($request) {
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

            // 2. إذا وجدت حركات، نبدأ قبل أقدم حركة بيوم كامل لضمان شموليتها
            if (!empty($earliestDates)) {
                $earliest = min($earliestDates);
                $startedAt = $earliest->copy()->subDay()->startOfDay();
            } else {
                $startedAt = now()->startOfYear();
            }

            // 3. إنشاء الفترة المحاسبية الأولى
            $period = AccountingPeriod::create([
                'name'       => $request->name,
                'started_at' => $startedAt,
                'status'     => 'open',
                'created_by' => Auth::id() ?? 1,
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

            return back()->with('success', 'تم بدء الفترة المحاسبية بنجاح وربط جميع العمليات السابقة بها.');
        });
    }

    public function snapshot(int $id): Response
    {
        $period = $this->periods->findWithSnapshot($id);

        abort_unless($period->snapshot, 404, 'لا يوجد Snapshot لهذه الفترة');

        return Inertia::render('Periods/Snapshot', [
            'period' => $period,
        ]);
    }

    public function purge(int $id): RedirectResponse
    {
        try {
            $this->rollover->purgePeriod($id);
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'تم حذف بيانات الفترة بنجاح. الـ Snapshot محفوظ.');
    }
}
