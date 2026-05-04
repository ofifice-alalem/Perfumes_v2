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
        $data = $request->validate([
            'name'                   => 'required|string|max:255',
            'category_id'            => 'required|exists:categories,id',
            'selling_type'           => 'required|in:tier_based,unit_priced',
            'price_tier_id'          => 'required_if:selling_type,tier_based|nullable|exists:price_tiers,id',
            'min_stock'              => 'nullable|numeric|min:0',
            'price_per_unit_regular' => 'required_if:selling_type,unit_priced|nullable|numeric|min:0',
            'price_per_unit_vip'     => 'required_if:selling_type,unit_priced|nullable|numeric|min:0',
            'full_bottle_regular'    => 'nullable|numeric|min:0',
            'full_bottle_vip'        => 'nullable|numeric|min:0',
            'bottle_volume'          => 'nullable|numeric|min:0.01',
        ]);

        if (isset($data['price_per_unit_vip'], $data['price_per_unit_regular'])) {
            if ($data['price_per_unit_vip'] > $data['price_per_unit_regular']) {
                return back()->with('error', 'سعر VIP يجب أن يكون أقل من أو يساوي السعر العادي');
            }
        }

        if (isset($data['full_bottle_vip'], $data['full_bottle_regular'])) {
            if ($data['full_bottle_vip'] > $data['full_bottle_regular']) {
                return back()->with('error', 'سعر VIP للعبوة يجب أن يكون أقل من أو يساوي السعر العادي');
            }
        }

        $this->products->createWithRelations($data);

        return back()->with('success', 'تم إضافة المنتج بنجاح');
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name'                   => 'required|string|max:255',
            'category_id'            => 'required|exists:categories,id',
            'selling_type'           => 'required|in:tier_based,unit_priced',
            'price_tier_id'          => 'required_if:selling_type,tier_based|nullable|exists:price_tiers,id',
            'min_stock'              => 'nullable|numeric|min:0',
            'price_per_unit_regular' => 'required_if:selling_type,unit_priced|nullable|numeric|min:0',
            'price_per_unit_vip'     => 'required_if:selling_type,unit_priced|nullable|numeric|min:0',
            'full_bottle_regular'    => 'nullable|numeric|min:0',
            'full_bottle_vip'        => 'nullable|numeric|min:0',
            'bottle_volume'          => 'nullable|numeric|min:0.01',
        ]);

        if (isset($data['price_per_unit_vip'], $data['price_per_unit_regular'])) {
            if ($data['price_per_unit_vip'] > $data['price_per_unit_regular']) {
                return back()->with('error', 'سعر VIP يجب أن يكون أقل من أو يساوي السعر العادي');
            }
        }

        if (isset($data['full_bottle_vip'], $data['full_bottle_regular'])) {
            if ($data['full_bottle_vip'] > $data['full_bottle_regular']) {
                return back()->with('error', 'سعر VIP للعبوة يجب أن يكون أقل من أو يساوي السعر العادي');
            }
        }

        $this->products->updateWithRelations($id, $data);

        return back()->with('success', 'تم تحديث المنتج بنجاح');
    }

    public function destroy(int $id)
    {
        if ($this->products->isUsed($id)) {
            return back()->with('error', 'لا يمكن حذف منتج مرتبط بفواتير أو مشتريات');
        }

        $this->products->delete($id);

        return back()->with('success', 'تم حذف المنتج بنجاح');
    }
}
