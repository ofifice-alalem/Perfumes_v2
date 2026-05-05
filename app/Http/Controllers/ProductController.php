<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Models\Category;
use App\Models\PriceTier;
use App\Repositories\Contracts\ProductRepositoryInterface;
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

    public function store(ProductRequest $request)
    {
        $this->products->createWithRelations($request->validated());

        return back()->with('success', 'تم إضافة المنتج بنجاح');
    }

    public function update(ProductRequest $request, int $id)
    {
        $this->products->updateWithRelations($id, $request->validated());

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
