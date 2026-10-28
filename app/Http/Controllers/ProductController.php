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
        $name = trim($request->name);
        $conflict = Product::where('name', $name)->first();
        if ($conflict) {
            return back()->withErrors([
                'name' => 'اسم المنتج "' . $conflict->name . '" موجود مسبقاً في المنظومة، لا يمكن تكرار نفس الاسم.',
            ])->withInput();
        }

        $this->products->createWithRelations($request->validated());

        return back()->with('success', 'تم إضافة المنتج بنجاح');
    }

    public function update(ProductRequest $request, int $id)
    {
        $name = trim($request->name);
        $conflictName = Product::where('name', $name)->where('id', '!=', $id)->first();
        if ($conflictName) {
            return back()->withErrors([
                'name' => 'اسم المنتج "' . $conflictName->name . '" موجود مسبقاً لمنتج آخر، يرجى اختيار اسم غير مكرر.',
            ])->withInput();
        }

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

    public function exportExcel()
    {
        $this->products->exportCatalogExcel();
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
