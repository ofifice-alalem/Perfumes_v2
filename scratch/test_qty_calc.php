<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Invoice;

$inv = Invoice::with(['items.product', 'items.size'])->find(50621);
foreach ($inv->items as $i => $item) {
    $saleType = (string)($item->sale_type ?? '');
    $rawQty = (float)$item->quantity;
    $uPrice = (float)$item->unit_price;
    $lTotal = (float)$item->line_total;

    echo "Item $i: name={$item->product->name}, sale_type=$saleType, rawQty=$rawQty, uPrice=$uPrice, lTotal=$lTotal\n";

    if ($uPrice > 0 && abs(($rawQty * $uPrice) - $lTotal) > 0.01) {
        $calcQty = $lTotal / $uPrice;
        echo "   -> Math Condition TRIGGERED! calcQty = $calcQty\n";
    } else {
        $calcQty = $rawQty;
        echo "   -> Math Condition NOT triggered! calcQty = $calcQty\n";
    }
}
