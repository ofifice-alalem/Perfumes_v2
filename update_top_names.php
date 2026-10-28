<?php
/**
 * أداة تحديث أسماء عطور فئة "توب" بإضافة (Top) وحذف حرف الـ T الزائد من النهاية
 * -------------------------------------------------------------------------
 */

$basePath = __DIR__;

if (!file_exists($basePath . '/vendor/autoload.php')) {
    echo "\n❌ خطأ: لم يتم العثور على vendor/autoload.php في مسار المشروع: {$basePath}\n";
    exit(1);
}

require $basePath . '/vendor/autoload.php';
$app = require_once $basePath . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\PriceTier;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;

echo "\n======================================================\n";
echo "    أداة تنسيق وتحديث أسماء عطور فئة توب لإضافة (Top)   \n";
echo "======================================================\n\n";

$topTier = PriceTier::where('name', 'like', '%توب%')
    ->where('name', 'not like', '%+%')
    ->first();

if (!$topTier) {
    echo "⚠️ لم يتم العثور على فئة توب في قاعدة البيانات.\n";
    exit(0);
}

function cleanPerfumeName($name) {
    $trimmed = trim($name);
    
    if (preg_match('/\s*\(top\)$/i', $trimmed)) {
        return $trimmed;
    }

    if (preg_match('/^(.*?)\s+TOP$/i', $trimmed, $m)) {
        return trim($m[1]) . ' (Top)';
    }

    if (preg_match('/^(.*?)\s+[tT]$/u', $trimmed, $m)) {
        return trim($m[1]) . ' (Top)';
    }

    if (preg_match('/^(.*?)\s+LVT$/i', $trimmed, $m)) {
        return trim($m[1]) . ' LV (Top)';
    }

    if (preg_match('/^(.*?)\s+M\s*T$/i', $trimmed, $m)) {
        return trim($m[1]) . ' M (Top)';
    }

    if (preg_match('/^(.*?)\s+TM$/i', $trimmed, $m)) {
        return trim($m[1]) . ' M (Top)';
    }

    if (preg_match('/^(.*?)\s+(?:TW|WT)$/i', $trimmed, $m)) {
        return trim($m[1]) . ' W (Top)';
    }

    return $trimmed . ' (Top)';
}

$products = Product::where('price_tier_id', $topTier->id)->get();
echo "📊 تم العثور على ({$products->count()}) صنف في فئة '{$topTier->name}'.\n";

DB::beginTransaction();

try {
    $updatedCount = 0;

    foreach ($products as $p) {
        $old = $p->name;
        $new = cleanPerfumeName($old);
        if ($new !== $old) {
            $p->name = $new;
            $p->save();
            $updatedCount++;
            echo "   ✔️ [{$updatedCount}] {$old} ➔ {$new}\n";
        }
    }

    DB::commit();

    echo "\n======================================================\n";
    echo "✅ تم بنجاح تحديث وتنسيق أسماء ({$updatedCount}) صنف.\n";
    echo "======================================================\n";

    try {
        Artisan::call('cache:clear');
        echo "🧹 تم تفريغ كاش المنظومة بنجاح.\n\n";
    } catch (\Throwable $e) {}

} catch (\Throwable $e) {
    DB::rollBack();
    echo "\n❌ حدث خطأ أثناء التحديث:\n" . $e->getMessage() . "\n";
    exit(1);
}
