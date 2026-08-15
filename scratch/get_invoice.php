<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Invoice;

$invoiceId = 50621;
$inv = Invoice::with(['customer', 'user', 'items.product', 'items.size', 'payments.paymentMethod', 'settlements'])->find($invoiceId);

if (!$inv) {
    echo "INVOICE_NOT_FOUND_EXACT\n";
    $latest = Invoice::with(['customer', 'user', 'items.product', 'items.size'])->latest()->take(10)->get();
    echo json_encode($latest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} else {
    echo "INVOICE_FOUND:\n";
    echo json_encode($inv, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
