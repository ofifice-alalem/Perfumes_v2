<?php
/**
 * أداة مسح أصناف فئة "توب" من قاعدة البيانات
 * -------------------------------------------------------------------------
 * هذا السكربت مستقل بالكامل ويعمل في أي نسخة من منظومة Perfumes_v2
 * طريقة التشغيل:
 * 1) إما فتح موجه الأوامر وتشغيل: php delete_top_products.php
 * 2) أو النقر المزدوج على ملف: delete_top_products.bat
 */

// تحديد مسار مجلد المشروع الأساسي ديناميكياً
$basePath = __DIR__;

if (!file_exists($basePath . '/vendor/autoload.php')) {
    echo "\n❌ خطأ: لم يتم العثور على vendor/autoload.php في مسار المشروع: {$basePath}\n";
    echo "يرجى وضع هذا الملف داخل المجلد الرئيسي للمنظومة مباشرة.\n";
    exit(1);
}

require $basePath . '/vendor/autoload.php';
$app = require_once $basePath . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Category;
use App\Models\PriceTier;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;

echo "\n======================================================\n";
echo "       أداة مسح أصناف فئة (توب - TOP) من المنظومة       \n";
echo "======================================================\n\n";

// البحث عن فئة توب (PriceTier)
$topTier = PriceTier::where('name', 'like', '%توب%')
    ->where('name', 'not like', '%+%')
    ->first();

if (!$topTier) {
    echo "⚠️ لم يتم العثور على أي فئة سعرية (PriceTier) باسم 'توب' في قاعدة البيانات.\n";
    exit(0);
}

echo "✔️ تم العثور على الفئة: [{$topTier->name}] (المعرف: {$topTier->id})\n";

// البحث عن المنتجات المرتبطة
$products = Product::where('price_tier_id', $topTier->id)->get();
$count = $products->count();

if ($count === 0) {
    echo "ℹ️ لا توجد حالياً أي منتجات مسجلة تابعة لفئة '{$topTier->name}' في المنظومة.\n";
    echo "المنظومة نظيفة وجاهزة.\n\n";
    exit(0);
}

echo "🔍 تم العثور على: ({$count}) منتج يتبع فئة '{$topTier->name}'.\n";
echo "قائمة الأصناف:\n";
foreach ($products as $index => $prod) {
    echo "   " . ($index + 1) . ". {$prod->name} (ID: {$prod->id})\n";
}

echo "\n⏳ جارٍ بدء الحذف الآمن ضمن معاملة (Database Transaction)...\n";

DB::beginTransaction();

try {
    $productIds = $products->pluck('id')->toArray();

    // حذف الروابط التابعة إن وجدت
    if (Schema::hasTable('product_prices')) {
        DB::table('product_prices')->whereIn('product_id', $productIds)->delete();
    }

    // حذف المنتجات
    $deletedCount = Product::whereIn('id', $productIds)->delete();

    DB::commit();

    echo "✅ تم بنجاح حذف ({$deletedCount}) منتج من فئة '{$topTier->name}'.\n";

    // مسح الكاش للتطبيق
    try {
        Artisan::call('cache:clear');
        echo "🧹 تم تفريغ كاش المنظومة بنجاح.\n";
    } catch (\Throwable $e) {
        // تجاهل في حال عدم وجود كاش
    }

    echo "\n✨ اكتملت العملية بنجاح تام.\n";

} catch (\Throwable $e) {
    DB::rollBack();
    echo "\n❌ حدث خطأ أثناء عملية الحذف وتم التراجع عنها:\n";
    echo $e->getMessage() . "\n";
    exit(1);
}
