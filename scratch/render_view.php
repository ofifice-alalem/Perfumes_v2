<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Invoice;
use Illuminate\Support\Facades\View;

$inv = Invoice::with(['customer', 'user', 'items.product', 'items.size', 'payments.paymentMethod'])->find(50621);
$html = View::make('thermal-receipt', ['invoice' => $inv])->render();

// Search for items table section in html
if (preg_match('/<table class="items-table">.*?<\/table>/s', $html, $matches)) {
    echo "ITEMS_TABLE_HTML:\n" . $matches[0] . "\n";
} else {
    echo "NO_TABLE_MATCH\n";
}
