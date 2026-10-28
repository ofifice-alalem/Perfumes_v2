<?php
require 'c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/vendor/autoload.php';
$app = require_once 'c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;

$dbProducts = Product::where('price_tier_id', 2)->get(['id', 'name']);
$content = file_get_contents('c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/add_top_products.php');
preg_match('/\$perfumesList = \[([\s\S]*?)\];/u', $content, $m);
eval('$fileList = [' . $m[1] . '];');

// Detailed semantic map for the 49 DB products
$analysis = [];

foreach ($dbProducts as $p) {
    $id = $p->id;
    $db = $p->name;
    
    // Check match in file
    $matchType = 'فريد (غير موجود)';
    $matchedFile = null;
    $notes = '';

    switch ($id) {
        case 148: // هيدسون فالي
            $matchType = 'مشترك';
            $matchedFile = 'قصة هادسن فالي (Top)';
            $notes = 'نفس العطر مع إضافة اسم الدار "قصة"';
            break;
        case 149: // 212 VIP رجالي
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'كارولينا هيريرا 212 VIP غير موجود في الملف الجديد';
            break;
        case 150: // أمواج إنترلود
            $matchType = 'مشترك';
            $matchedFile = 'امواج انترلود (Top)';
            $notes = 'تطابق تام';
            break;
        case 151: // أنا الأبيض
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'لطافة أنا الأبيض غير موجود في الملف الجديد';
            break;
        case 152: // إيربا بورا R
            $matchType = 'مشترك';
            $matchedFile = 'زيرجوف اربابورا فولد (Top)';
            $notes = 'نفس العطر (Erba Pura) باختلاف تسمية المصدر';
            break;
        case 153: // اكس زيرجوف OD
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'إصدار OD من زيرجوف غير وارد في الملف';
            break;
        case 154: // الثائر دي مارلي
            $matchType = 'مشترك';
            $matchedFile = 'الثائر دي مارلي (Top)';
            $notes = 'تطابق تام (Althair Parfums de Marly)';
            break;
        case 155: // الفريد العربية
            $matchType = 'مشترك';
            $matchedFile = 'الفريد العربية للعود (Top)';
            $notes = 'نفس العطر مع إضافة "للعود"';
            break;
        case 156: // باسيفيك شيل لويس فيتون
            $matchType = 'مشترك';
            $matchedFile = 'باسيفيك شيل LV (Top)';
            $notes = 'نفس العطر مع اختصار لويس فيتون إلى LV';
            break;
        case 157: // بردا باردوكس
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'برادا بارادوكس النسائي (الملف يحتوي برادا برادايم الخضراء)';
            break;
        case 158: // بردا لاهوم
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'برادا لاهوم غير موجود في الملف الجديد';
            break;
        case 159: // برستيج
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'عطر برستيج غير موجود في الملف الجديد';
            break;
        case 160: // بكرات روج 540
            $matchType = 'مشترك';
            $matchedFile = 'بكرات روج (Top)';
            $notes = 'نفس العطر (مع حذف الرقم 540)';
            break;
        case 161: // بلاك أوركيد توم فورد R
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'بلاك أوركيد توم فورد غير موجود في الملف الجديد';
            break;
        case 162: // بيور دي بيون
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'بيور دي بيون غير موجود في الملف الجديد';
            break;
        case 163: // تيبوس استرال ميزون كريفلي
            $matchType = 'مشترك';
            $matchedFile = 'تیبوروز استرال مايزون كريفلي (Top)';
            $notes = 'نفس العطر (Tibereuse Astrale) باختلاف رسم الكلمة الأولى';
            break;
        case 164: // خمرية لطافة
            $matchType = 'مشترك';
            $matchedFile = 'خمره لطافة (Top)';
            $notes = 'نفس العطر (خمرة / خمرية)';
            break;
        case 165: // ديور هوم
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'ديور هوم العادي (الملف يحتوي ديور هوم انتنس)';
            break;
        case 166: // ديور هوم سبورت
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'ديور هوم سبورت غير موجود في الملف';
            break;
        case 167: // روسيندو ماتيو 5
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'روسيندو ماتيو رقم 5 غير موجود في الملف الجديد';
            break;
        case 168: // سفير العود
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'سفير العود غير موجود في الملف الجديد';
            break;
        case 169: // سيسبيرو فيبراتو
            $matchType = 'مشترك';
            $matchedFile = 'سسبيرو فيبرتوا (Top)';
            $notes = 'نفس العطر (Sospiro Vibrato) باختلاف إملائي طفيف';
            break;
        case 170: // سيك 25
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'عطر سيك 25 غير موجود في الملف الجديد';
            break;
        case 171: // شانيل لي ليون
            $matchType = 'مشترك';
            $matchedFile = 'شانيل لي ليغون (Top)';
            $notes = 'نفس العطر (Le Lion de Chanel)';
            break;
        case 172: // عود الأساطير
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'عود الأساطير غير موجود في الملف الجديد';
            break;
        case 173: // عود ماركاجو ميزون
            $matchType = 'مشترك';
            $matchedFile = 'عود ماراكوجا ميزون كريفلي (Top)';
            $notes = 'نفس العطر (Oud Maracuja Maison Crivelli)';
            break;
        case 174: // غروب
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'عطر غروب غير موجود في الملف الجديد';
            break;
        case 175: // فلور ناركوتيك
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'فلور ناركوتيك (Fleur Narcotique) غير موجود في الملف';
            break;
        case 176: // قصة هيدسون فالي
            $matchType = 'مشترك';
            $matchedFile = 'قصة هادسن فالي (Top)';
            $notes = 'تطابق تام مع اختلاف رسم "هيدسون/هادسن"';
            break;
        case 177: // قوتشي غيلتي إكسير
            $matchType = 'مشترك';
            $matchedFile = 'قوتشي غلتي الكسير M (Top)';
            $notes = 'تطابق تام (Gucci Guilty Elixir Pour Homme)';
            break;
        case 178: // كريد أفينتوس ممتاز
            $matchType = 'مشترك';
            $matchedFile = 'كريد أفنتوس M (Top)';
            $notes = 'نفس العطر (Creed Aventus)';
            break;
        case 179: // لويس فيتون إيماجينيشن
            $matchType = 'مشترك';
            $matchedFile = 'اميجينيشن LV (Top)';
            $notes = 'نفس العطر (Imagination Louis Vuitton)';
            break;
        case 180: // لويس فيتون إيماجينيشن T
            $matchType = 'مشترك';
            $matchedFile = 'اميجينيشن LV (Top)';
            $notes = 'تكرار لإيماجينيشن';
            break;
        case 181: // لي ميل جان بول R
            $matchType = 'مشترك جزئي';
            $matchedFile = 'جان بول لاميل الاكسير (Top)';
            $notes = 'إصدار مختلف من خط Le Male جان بول غوتييه';
            break;
        case 182: // مخلط عود
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'مخلط عود غير موجود في الملف الجديد';
            break;
        case 183: // ميجاميري
            $matchType = 'مشترك';
            $matchedFile = 'ميجمار أورتو باريزي M (Top)';
            $notes = 'نفس العطر (Megamare Orto Parisi)';
            break;
        case 184: // نيشان آني
            $matchType = 'مشترك';
            $matchedFile = 'نيشان اني (Top)';
            $notes = 'تطابق تام (Nishane Ani)';
            break;
        case 185: // نيشان هاشيفات
            $matchType = 'مشترك';
            $matchedFile = 'نیشان هاتشيفات (Top)';
            $notes = 'تطابق تام (Nishane Hacivat)';
            break;
        case 186: // بوس ذا سنت الالكسير
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'بوس ذا سنت الإكسير غير موجود (الملف يحتوي بوس بوتلد بيوند)';
            break;
        case 187: // مانجو
            $matchType = 'مشترك';
            $matchedFile = 'مانجو يونيك لكجري (Top)';
            $notes = 'نفس العطر (Mangonifiscent Unique\'e)';
            break;
        case 188: // تايغر بلقري
            $matchType = 'مشترك';
            $matchedFile = 'بلغاري تايقر (Top)';
            $notes = 'نفس العطر (Bvlgari Tygar)';
            break;
        case 189: // لادور بخور T
            $matchType = 'مشترك';
            $matchedFile = 'لادور بخور (Top)';
            $notes = 'تطابق تام';
            break;
        case 190: // ايرش لهب
            $matchType = 'مشترك';
            $matchedFile = 'هيرش لشهب (Top)';
            $notes = 'نفس العطر باختلاف إملائي';
            break;
        case 191: // سان لوران توب
            $matchType = 'خاص بالـ 49 فقط';
            $notes = 'سان لوران عام غير محدد في الملف (الملف يحتوي ماي سيلف إيف سان لوران)';
            break;
        case 192: // ارماني يو ابسولتي
            $matchType = 'مشترك';
            $matchedFile = 'ارماني وديو ابسلوتلي M (Top)';
            $notes = 'نفس العطر (Stronger With You Absolutely)';
            break;
        case 193: // جان بول جاران
            $matchType = 'مشترك';
            $matchedFile = 'جان بول براديس جاردن W (Top)';
            $notes = 'نفس العطر (Le Beau Paradise Garden)';
            break;
        case 194: // انت وبس
            $matchType = 'مشترك';
            $matchedFile = 'انت ويس (Top)';
            $notes = 'نفس العطر باختلاف إملائي (س/ب)';
            break;
        case 195: // سول بتشولي توب
            $matchType = 'مشترك';
            $matchedFile = 'صولوي باتشولي فيرتوس (Top)';
            $notes = 'نفس العطر (Soleil Patchouli Vertus)';
            break;
        case 199: // كروش مي توب
            $matchType = 'مشترك';
            $matchedFile = 'کراش اون مي (Top)';
            $notes = 'نفس العطر (Crash On Me Unique\'e)';
            break;
    }

    $analysis[] = [
        'id' => $id,
        'db' => $db,
        'type' => $matchType,
        'file' => $matchedFile,
        'notes' => $notes
    ];
}

$shared = array_filter($analysis, fn($x) => str_contains($x['type'], 'مشترك'));
$exclusive = array_filter($analysis, fn($x) => str_contains($x['type'], 'خاص'));

echo "Shared Count: " . count($shared) . "\n";
echo "Exclusive to 49 Count: " . count($exclusive) . "\n";
