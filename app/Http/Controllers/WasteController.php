<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Repositories\Contracts\WasteRepositoryInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class WasteController extends Controller
{
    public function __construct(private WasteRepositoryInterface $waste) {}

    public function index(): Response
    {
        return Inertia::render('Waste/Index', [
            'logs' => $this->waste->allWithRelations(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Waste/Create', [
            'products' => Product::with('category')->orderBy('name')->get(),
        ]);
    }

    public function storeWithItems(Request $request)
    {
        $data = $request->validate([
            'notes'              => 'nullable|string',
            'items'              => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity'   => 'required|numeric|min:0.01',
            'items.*.reason'     => 'required|in:broken,spilled,expired,lost,other',
            'items.*.notes'      => 'nullable|string',
        ]);

        $data['user_id'] = Auth::id() ?? 1;
        $log = $this->waste->createLog($data);

        foreach ($data['items'] as $item) {
            $this->waste->addItem($log->id, $item);
        }

        return redirect()->route('waste.show', $log->id)
            ->with('success', 'تم تسجيل التالف وتحديث المخزون');
    }

    public function show(int $id): Response
    {
        return Inertia::render('Waste/Show', [
            'log' => $this->waste->findWithRelations($id),
        ]);
    }

    public function addItem(Request $request, int $id)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity'   => 'required|numeric|min:0.01',
            'reason'     => 'required|in:broken,spilled,expired,lost,other',
            'notes'      => 'nullable|string',
        ]);

        try {
            $this->waste->addItem($id, $data);
            return back()->with('success', 'تم إضافة المنتج وخصم المخزون');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function updateItem(int $id, int $itemId)
    {
        $data = request()->validate([
            'quantity' => 'required|numeric|min:0.01',
            'reason'   => 'required|in:broken,spilled,expired,lost,other',
        ]);

        try {
            $this->waste->updateItem($id, $itemId, $data);
            return back()->with('success', 'تم تحديث السطر');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function removeItem(int $id, int $itemId)
    {
        try {
            $this->waste->removeItem($id, $itemId);
            return back()->with('success', 'تم حذف السطر وإعادة المخزون');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function destroy(int $id)
    {
        $log = $this->waste->find($id);

        foreach ($log->items as $item) {
            $item->product->increment('stock', $item->quantity);
        }

        $log->delete();

        return redirect()->route('waste.index')->with('success', 'تم حذف سجل التالف');
    }
}
