<?php

ini_set('display_errors', 1);
error_reporting(E_ALL);

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Customer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

// Get test product
$prod = Product::first();
if (!$prod) {
    echo "No product found.\n";
    exit;
}

$testData = [
    'customer_id'   => 1,
    'customer_type' => 'regular',
    'notes'         => 'Test Invoice Benchmark',
    'items'         => [],
    'payments'      => [
        ['payment_method_id' => 1, 'amount' => 50.0, 'notes' => 'Cash']
    ]
];

// Add 10 items to test data
for ($i = 0; $i < 10; $i++) {
    $testData['items'][] = [
        'product_id' => $prod->id,
        'size_id'    => null,
        'sale_type'  => 'unit_based',
        'quantity'   => 1.0,
        'unit_price' => 10.0,
        'line_total' => 10.0,
    ];
}

DB::beginTransaction();

$t0 = microtime(true);

// Standard creation simulation
$customer = Customer::findOrFail($testData['customer_id']);
$invoice = Invoice::create([
    'user_id'         => 1,
    'customer_id'     => $testData['customer_id'],
    'customer_type'   => 'regular',
    'total'           => 0,
    'paid_amount'     => 0,
    'due_amount'      => 0,
    'payment_status'  => 'unpaid',
    'notes'           => $testData['notes'],
]);

InvoiceItem::withoutEvents(function() use ($invoice, $testData) {
    Payment::withoutEvents(function() use ($invoice, $testData) {
        $totalAmount = 0;
        foreach ($testData['items'] as $item) {
            InvoiceItem::create([
                'invoice_id'  => $invoice->id,
                'product_id'  => $item['product_id'],
                'size_id'     => $item['size_id'] ?? null,
                'sale_type'   => $item['sale_type'],
                'quantity'    => $item['quantity'],
                'unit_price'  => $item['unit_price'],
                'line_total'  => $item['line_total'],
            ]);
            Product::where('id', $item['product_id'])->decrement('stock', $item['quantity']);
            $totalAmount += (float)$item['line_total'];
        }

        $totalPaid = 0;
        foreach ($testData['payments'] ?? [] as $payment) {
            $amount = (float) $payment['amount'];
            if ($amount <= 0) continue;

            Payment::create([
                'customer_id'       => $invoice->customer_id,
                'user_id'           => 1,
                'invoice_id'        => $invoice->id,
                'payment_method_id' => $payment['payment_method_id'],
                'amount'            => $amount,
                'notes'             => $payment['notes'] ?? null,
                'created_at'        => now(),
            ]);
            $totalPaid += $amount;
        }

        $invoice->total       = $totalAmount;
        $invoice->paid_amount = $totalPaid;
        $invoice->due_amount  = $totalAmount - $totalPaid;
        $invoice->payment_status = match (true) {
            $totalPaid <= 0            => 'unpaid',
            $totalPaid >= $totalAmount => 'paid',
            default                    => 'partial',
        };
        $invoice->saveQuietly();

        \App\Observers\InvoiceItemObserver::recalculateCustomer($invoice->customer_id);
    });
});

$t1 = microtime(true);
DB::rollBack();

echo "OPTIMIZED Invoice Store (10 items + 1 payment) took: " . number_format(($t1 - $t0) * 1000, 2) . " ms (0." . round(($t1 - $t0) * 1000) . "s)!\n";
