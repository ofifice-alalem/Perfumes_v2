<?php

namespace App\Http\Controllers;

use App\Http\Requests\RolloverRequest;
use App\Http\Requests\StartPeriodRequest;
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

    public function startFirst(StartPeriodRequest $request): RedirectResponse
    {
        try {
            $this->rollover->startFirstPeriod($request->validated('name'), Auth::id());
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'تم بدء الفترة المحاسبية بنجاح وربط جميع العمليات السابقة بها.');
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
        @set_time_limit(300);

        try {
            $this->rollover->purgePeriod($id);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Purge error: ' . $e->getMessage(), [
                'exception' => $e,
            ]);
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'تم حذف بيانات الفترة بنجاح. الـ Snapshot محفوظ.');
    }
}
