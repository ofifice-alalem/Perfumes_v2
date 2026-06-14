<?php

namespace App\Http\Controllers;

use App\Http\Requests\WasteLogRequest;
use App\Models\Product;
use App\Models\User;
use App\Models\WasteItem;
use App\Repositories\Contracts\WasteLogRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class WasteLogController extends Controller
{
    public function __construct(
        private WasteLogRepositoryInterface $wasteLogs,
    ) {}

    public function index(): Response
    {
        return Inertia::render('WasteLogs/Index', [
            'wasteLogs' => $this->wasteLogs->paginated(30),
            'users'     => User::orderBy('name')->get(['id', 'name']),
            'products'  => Product::with('category')->orderBy('name')->get(['id', 'name', 'stock', 'category_id', 'qrcode']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('WasteLogs/Create', [
            'products' => Product::with('category')->orderBy('name')->get(['id', 'name', 'stock', 'category_id', 'qrcode']),
        ]);
    }

    public function store(WasteLogRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $wasteLog = DB::transaction(function () use ($data) {
            // Get user_id: use authenticated user or fallback to first user (Admin)
            $userId = Auth::id() ?? \App\Models\User::first()->id;

            // Create waste log
            $wasteLog = $this->wasteLogs->create([
                'user_id' => $userId,
                'notes'   => $data['notes'] ?? null,
            ]);

            // Create waste items (observer will handle stock decrease)
            foreach ($data['items'] as $item) {
                WasteItem::create([
                    'waste_log_id' => $wasteLog->id,
                    'product_id'   => $item['product_id'],
                    'quantity'     => $item['quantity'],
                    'reason'       => $item['reason'],
                    'notes'        => $item['notes'] ?? null,
                    'created_at'   => now(),
                ]);
            }

            return $wasteLog;
        });

        return redirect()->route('waste-logs.show', $wasteLog->id)
            ->with('success', 'تم تسجيل التالف بنجاح');
    }

    public function show(int $id): Response
    {
        return Inertia::render('WasteLogs/Show', [
            'wasteLog' => $this->wasteLogs->findWithRelations($id),
        ]);
    }

    public function destroy(int $id): RedirectResponse
    {
        $wasteLog = $this->wasteLogs->find($id);

        DB::transaction(function () use ($wasteLog) {
            // Observer will automatically restore stock when items are deleted
            // CASCADE delete will handle items deletion
            $wasteLog->delete();
        });

        return redirect()->route('waste-logs.index')
            ->with('success', 'تم حذف سجل التالف بنجاح');
    }
}
