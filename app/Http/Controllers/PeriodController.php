<?php

namespace App\Http\Controllers;

use App\Http\Requests\RolloverRequest;
use App\Repositories\Contracts\AccountingPeriodRepositoryInterface;
use App\Services\RolloverService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PeriodController extends Controller
{
    public function __construct(
        private AccountingPeriodRepositoryInterface $periods,
        private RolloverService $rollover,
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

        return Inertia::render('Periods/Rollover', [
            'currentPeriod' => $current,
            'preview'       => $this->rollover->previewSnapshot(),
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

        \App\Models\AccountingPeriod::create([
            'name'       => $request->name,
            'started_at' => now(),
            'status'     => 'open',
            'created_by' => \Illuminate\Support\Facades\Auth::id(),
        ]);

        return back()->with('success', 'تم بدء الفترة المحاسبية بنجاح.');
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
