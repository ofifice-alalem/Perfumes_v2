<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Models\Category;
use App\Models\PriceTier;
use App\Models\Product;
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
        // التحقق من تفرد QR عند وجوده
        if (!empty($request->qrcode)) {
            $conflict = Product::where('qrcode', $request->qrcode)
                ->where('id', '!=', $id)
                ->first();
            if ($conflict) {
                return back()->withErrors([
                    'qrcode' => 'الكود موجود بالفعل للمنتج “' . $conflict->name . '”',
                ])->withInput();
            }
        }

        $this->products->updateWithRelations($id, $request->validated());

        return back()->with('success', 'تم تحديث المنتج بنجاح');
    }

    public function updateQrcode(int $id)
    {
        $qrcode = request('qrcode');

        // التحقق من تفرد QR
        if (!empty($qrcode)) {
            $conflict = Product::where('qrcode', $qrcode)
                ->where('id', '!=', $id)
                ->first();
            if ($conflict) {
                return back()->with('error', 'الكود موجود بالفعل للمنتج "' . $conflict->name . '"');
            }
        }

        request()->validate(['qrcode' => 'nullable|string|max:100']);

        $this->products->update(['qrcode' => $qrcode], $id);

        return back()->with('success', 'تم تحديث QR Code بنجاح');
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
