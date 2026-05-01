<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\PriceTier;
use App\Repositories\Contracts\ProductRepositoryInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(private ProductRepositoryInterface $products) {}

    public function index(): Response
    {
        return Inertia::render('Products/Index', [
            'products'   => $this->products->allWithRelations(),
            'categories' => Category::orderBy('name')->get(),
            'tiers'      => PriceTier::orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $base = $request->validate([
            'name'          => 'required|string|max:255',
            'category_id'   => 'required|exists:categories,id',
            'selling_type'  => 'required|in:tier_based,unit_priced',
            'price_tier_id' => 'required_if:selling_type,tier_based|nullable|exists:price_tiers,id',
            'min_stock'     => 'nullable|numeric|min:0',
        ]);

        // التحقق من توافق selling_type مع وحدة التصنيف
        $category = Category::findOrFail($base['category_id']);
        if ($category->unit !== 'ml' && $base['selling_type'] === 'tier_based') {
            return back()->withErrors(['selling_type' => 'العطور الزيتية فقط تدعم نظام التير']);
        }

        if ($base['selling_type'] === 'tier_based') {
            $this->products->createTierBased($base);
        } else {
            // المواد التشغيلية لا تحتاج أسعار
            $isOperational = $category->is_operational;

            $prices = $request->validate([
                'price_per_unit_regular' => $isOperational ? 'nullable|numeric|min:0' : 'required|numeric|min:0',
                'price_per_unit_vip'     => $isOperational ? 'nullable|numeric|min:0' : 'required|numeric|min:0',
                'full_bottle_regular'    => 'nullable|numeric|min:0',
                'full_bottle_vip'        => 'nullable|numeric|min:0',
                'bottle_volume'          => 'nullable|numeric|min:0',
            ]);

            $this->products->createUnitPriced(
                $base,
                $isOperational ? null : [
                    'price_per_unit_regular' => $prices['price_per_unit_regular'],
                    'price_per_unit_vip'     => $prices['price_per_unit_vip'],
                    'full_bottle_regular'    => $prices['full_bottle_regular'] ?? null,
                    'full_bottle_vip'        => $prices['full_bottle_vip'] ?? null,
                ],
                isset($prices['bottle_volume']) && $prices['bottle_volume'] ? (float) $prices['bottle_volume'] : null
            );
        }

        return back()->with('success', 'تم إضافة المنتج بنجاح');
    }

    public function update(Request $request, int $id)
    {
        $base = $request->validate([
            'name'          => 'required|string|max:255',
            'category_id'   => 'required|exists:categories,id',
            'selling_type'  => 'required|in:tier_based,unit_priced',
            'price_tier_id' => 'required_if:selling_type,tier_based|nullable|exists:price_tiers,id',
            'min_stock'     => 'nullable|numeric|min:0',
        ]);

        $priceData    = null;
        $bottleVolume = null;

        if ($base['selling_type'] === 'unit_priced') {
            $category     = Category::findOrFail($base['category_id']);
            $isOperational = $category->is_operational;

            if (!$isOperational) {
                $prices = $request->validate([
                    'price_per_unit_regular' => 'required|numeric|min:0',
                    'price_per_unit_vip'     => 'required|numeric|min:0',
                    'full_bottle_regular'    => 'nullable|numeric|min:0',
                    'full_bottle_vip'        => 'nullable|numeric|min:0',
                    'bottle_volume'          => 'nullable|numeric|min:0',
                ]);

                $priceData = [
                    'price_per_unit_regular' => $prices['price_per_unit_regular'],
                    'price_per_unit_vip'     => $prices['price_per_unit_vip'],
                    'full_bottle_regular'    => $prices['full_bottle_regular'] ?? null,
                    'full_bottle_vip'        => $prices['full_bottle_vip'] ?? null,
                ];
                $bottleVolume = isset($prices['bottle_volume']) && $prices['bottle_volume'] ? (float) $prices['bottle_volume'] : null;
            }
        }

        $this->products->updateProduct($id, $base, $priceData, $bottleVolume);

        return back()->with('success', 'تم تحديث المنتج بنجاح');
    }

    public function destroy(int $id)
    {
        if ($this->products->isUsed($id)) {
            return back()->with('error', 'لا يمكن حذف منتج مرتبط بفواتير');
        }

        $this->products->delete($id);

        return back()->with('success', 'تم حذف المنتج بنجاح');
    }
}
