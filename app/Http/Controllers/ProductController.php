<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Repositories\Contracts\ProductRepositoryInterface;
use App\Repositories\Contracts\CategoryRepositoryInterface;
use App\Repositories\Contracts\PriceTierRepositoryInterface;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(
        private ProductRepositoryInterface $products,
        private CategoryRepositoryInterface $categories,
        private PriceTierRepositoryInterface $tiers
    ) {}

    public function index(): Response
    {
        return Inertia::render('Products/Index', [
            'products'       => $this->products->paginated(20),
            'categories'     => fn() => $this->categories->allOrdered(),
            'tiers'          => fn() => $this->tiers->allOrdered(),
            'missingQrCount' => fn() => $this->products->getMissingQrcodesCount(),
        ]);
    }

    public function printList(): \Illuminate\Http\JsonResponse
    {
        $products = $this->products->getFilteredProductsForPrint();
        return response()->json([
            'success'  => true,
            'count'    => $products->count(),
            'products' => $products,
        ]);
    }

    public function searchSuggestions(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
        $q = (string)$request->query('q', '');
        $items = $this->products->searchSuggestions($q, 15);
        return response()->json([
            'success'     => true,
            'suggestions' => $items,
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

    public function updateQrcode(int $id)
    {
        $data = request()->validate([
            'qrcode' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('products', 'qrcode')->ignore($id),
            ],
        ], [
            'qrcode.unique' => 'كود الباركود / QR موجود مسبقاً لمنتج آخر في المنظومة',
        ]);

        $this->products->update(['qrcode' => $data['qrcode'] ?? null], $id);

        return back()->with('success', 'تم تحديث QR Code بنجاح');
    }

    public function generateAllQrcodes()
    {
        $count = $this->products->generateMissingQrcodes();

        if ($count === 0) {
            return back()->with('info', 'جميع المنتجات لديها أكواد QR بالفعل.');
        }

        return back()->with('success', "تم توليد باركود لجميع المنتجات المتبقية بنجاح ({$count} منتج)");
    }


    public function destroy(int $id)
    {
        if ($this->products->isUsed($id)) {
            return back()->with('error', 'لا يمكن حذف منتج مرتبط بفواتير أو مشتريات');
        }

        $this->products->delete($id);

        return back()->with('success', 'تم حذف المنتج بنجاح');
    }

    public function exportExcel(\Illuminate\Http\Request $request)
    {
        $rawIds = $request->input('ids');
        $productIds = null;
        if (!empty($rawIds)) {
            if (is_array($rawIds)) {
                $productIds = array_map('intval', $rawIds);
            } else {
                $productIds = array_filter(array_map('intval', explode(',', (string)$rawIds)));
            }
        } elseif ($request->has('filter')) {
            $filtered = $this->products->getFilteredProductsForPrint();
            $productIds = $filtered->pluck('id')->all();
        }

        $this->products->exportCatalogExcel($productIds);
    }

    public function importExcel(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'file'        => 'required|file|mimes:xlsx,xls|max:20480',
            'import_mode' => 'nullable|string|in:add_only,wipe_and_replace',
        ], [
            'file.required' => 'يرجى اختيار ملف Excel للرفع',
            'file.mimes'    => 'يجب أن يكون الملف بصيغة xlsx أو xls',
            'file.max'      => 'حجم الملف يجب ألا يتجاوز 20 ميغابايت',
        ]);

        $mode = $request->input('import_mode', 'add_only');

        try {
            $stats = $this->products->importCatalogExcel($request->file('file'), $mode);

            if ($mode === 'wipe_and_replace') {
                $msg = sprintf(
                    'تم مسح كافة البيانات السابقة بالكامل واستيراد: %d منتج، %d تصنيف، %d حجم، %d تير، %d سعر تير بنجاح.',
                    $stats['products'],
                    $stats['categories'],
                    $stats['sizes'],
                    $stats['tiers'],
                    $stats['tier_prices']
                );
            } else {
                $msg = sprintf(
                    'تمت إضافة %d منتج جديد بنجاح (وتم تخطي %d منتج موجود مسبقاً دون تغيير).',
                    $stats['products'],
                    $stats['skipped']
                );
            }

            return back()->with('success', $msg);
        } catch (\Throwable $e) {
            return back()->with('error', 'حدث خطأ أثناء استيراد الملف: ' . $e->getMessage());
        }
    }
}
