<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Invoice;

$inv = Invoice::with('items')->find(50621);
foreach ($inv->items as $i => $item) {
    echo "ITEM $i (ID {$item->id}):\n";
    echo "  sale_type raw: "; var_dump($item->sale_type);
    if (is_object($item->sale_type)) {
        echo "  sale_type value: "; var_dump($item->sale_type->value ?? 'no_value');
    }
}
