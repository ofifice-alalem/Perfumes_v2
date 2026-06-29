<?php

namespace App\Http\Controllers;

use App\Models\Size;
use App\Repositories\Contracts\PriceTierRepositoryInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PriceTierController extends Controller
{
    public function __construct(private PriceTierRepositoryInterface $tiers) {}

    public function index(): Response
    {
        return Inertia::render('PriceTiers/Index', [
            'tiers' => $this->tiers->allWithPrices(),
            'sizes' => Size::where('unit', 'ml')->orderBy('value')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:10|unique:price_tiers,name',
            'description' => 'nullable|string|max:255',
        ]);

        $this->tiers->create($data);

        return back()->with('success', 'تم إضافة التير بنجاح');
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:10|unique:price_tiers,name,' . $id,
            'description' => 'nullable|string|max:255',
        ]);

        $this->tiers->update($data, $id);

        return back()->with('success', 'تم تحديث التير بنجاح');
    }

    public function destroy(int $id)
    {
        if ($this->tiers->hasProducts($id)) {
            return back()->with('error', 'لا يمكن حذف تير مرتبط بمنتجات');
        }

        $this->tiers->delete($id);

        return back()->with('success', 'تم حذف التير بنجاح');
    }

    public function updatePrices(Request $request, int $id)
    {
        $data = $request->validate([
            'prices'                 => 'required|array',
            'prices.*.size_id'       => 'required|exists:sizes,id',
            'prices.*.price_regular' => 'nullable|numeric|min:0',
            'prices.*.price_vip'     => 'nullable|numeric|min:0',
        ]);

        // Filter out sizes with no prices (both null/empty/0)
        $activePrices = array_filter($data['prices'], function ($price) {
            $regular = $price['price_regular'] ?? 0;
            $vip = $price['price_vip'] ?? 0;
            return $regular > 0 || $vip > 0;
        });

        foreach ($activePrices as $price) {
            $regular = $price['price_regular'] ?? 0;
            $vip = $price['price_vip'] ?? 0;
            if ($vip > 0 && $regular > 0 && $vip > $regular) {
                return back()->with('error', 'سعر VIP يجب أن يكون أقل من أو يساوي السعر العادي');
            }
        }

        $this->tiers->syncPrices($id, $activePrices, $data['prices']);

        return back()->with('success', 'تم تحديث الأسعار بنجاح');
    }
}
