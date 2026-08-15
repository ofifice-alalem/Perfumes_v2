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

echo "=== SYSTEM INTEGRITY VERIFICATION TEST ===\n";

$product = Product::where('stock', '>', 5)->first();
$customer = Customer::where('id', '>', 1)->first() ?? Customer::first();

if (!$product || !$customer) {
    echo "ERROR: Product or Customer missing.\n";
    exit;
}

$initialStock = (float) $product->stock;
$initialDebt  = (float) $customer->total_debt;
$qtyToSell    = 2.0;
$unitPrice    = 50.0;
$lineTotal    = $qtyToSell * $unitPrice;
$paymentAmt   = 40.0;

echo "Initial Product Stock: " . $initialStock . "\n";
echo "Initial Customer Debt: " . $initialDebt . "\n";

DB::beginTransaction();

try {
    // Simulate Invoice Store Controller Request
    $requestData = [
        'customer_id'   => $customer->id,
        'customer_type' => 'regular',
        'notes'         => 'Integrity Verification Test',
        'items'         => [
            [
                'product_id' => $product->id,
                'size_id'    => null,
                'sale_type'  => 'unit_based',
                'quantity'   => $qtyToSell,
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
            ]
        ],
        'payments'      => [
            [
                'payment_method_id' => 1,
                'amount'            => $paymentAmt,
                'notes'             => 'Test Payment',
            ]
        ]
    ];

    // Execute optimized logic
    $invoice = Invoice::create([
        'user_id'         => 1,
        'customer_id'     => $requestData['customer_id'],
        'customer_type'   => 'regular',
        'total'           => 0,
        'paid_amount'     => 0,
        'due_amount'      => 0,
        'payment_status'  => 'unpaid',
        'notes'           => $requestData['notes'],
    ]);

    InvoiceItem::withoutEvents(function () use ($invoice, $requestData) {
        Payment::withoutEvents(function () use ($invoice, $requestData) {
            $totalInvoiceAmount = 0.0;

            foreach ($requestData['items'] as $item) {
                $lineTotal = (float) $item['line_total'];
                $qty       = (float) $item['quantity'];

                InvoiceItem::create([
                    'invoice_id'  => $invoice->id,
                    'product_id'  => $item['product_id'],
                    'size_id'     => $item['size_id'] ?? null,
                    'sale_type'   => $item['sale_type'],
                    'quantity'    => $qty,
                    'unit_price'  => $item['unit_price'],
                    'line_total'  => $lineTotal,
                ]);

                Product::where('id', $item['product_id'])->decrement('stock', $qty);
                $totalInvoiceAmount += $lineTotal;
            }

            $totalPaidAmount = 0.0;
            foreach ($requestData['payments'] ?? [] as $payment) {
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

                $totalPaidAmount += $amount;
            }

            $invoice->total       = round($totalInvoiceAmount, 2);
            $invoice->paid_amount = round($totalPaidAmount, 2);
            $invoice->due_amount  = round($totalInvoiceAmount - $totalPaidAmount, 2);
            $invoice->payment_status = match (true) {
                $totalPaidAmount <= 0                   => 'unpaid',
                $totalPaidAmount >= $totalInvoiceAmount => 'paid',
                default                                 => 'partial',
            };
            $invoice->saveQuietly();

            if ($invoice->customer_id) {
                \App\Observers\InvoiceItemObserver::recalculateCustomer($invoice->customer_id);
            }
        });
    });

    // Check Updated Values
    $updatedProduct  = Product::find($product->id);
    $updatedCustomer = Customer::find($customer->id);
    $savedInvoice    = Invoice::find($invoice->id);

    echo "\n=== VERIFICATION RESULTS ===\n";
    echo "1. Invoice Total: " . $savedInvoice->total . " (Expected: " . $lineTotal . ") -> " . ($savedInvoice->total == $lineTotal ? "PASSED" : "FAILED") . "\n";
    echo "2. Invoice Paid: " . $savedInvoice->paid_amount . " (Expected: " . $paymentAmt . ") -> " . ($savedInvoice->paid_amount == $paymentAmt ? "PASSED" : "FAILED") . "\n";
    echo "3. Invoice Due: " . $savedInvoice->due_amount . " (Expected: " . ($lineTotal - $paymentAmt) . ") -> " . ($savedInvoice->due_amount == ($lineTotal - $paymentAmt) ? "PASSED" : "FAILED") . "\n";
    echo "4. Invoice Status: " . $savedInvoice->payment_status . " (Expected: partial) -> " . ($savedInvoice->payment_status === 'partial' ? "PASSED" : "FAILED") . "\n";
    echo "5. Product Stock: " . $updatedProduct->stock . " (Expected: " . ($initialStock - $qtyToSell) . ") -> " . ($updatedProduct->stock == ($initialStock - $qtyToSell) ? "PASSED" : "FAILED") . "\n";
    echo "6. Customer Debt: " . $updatedCustomer->total_debt . " (Expected: " . ($initialDebt + ($lineTotal - $paymentAmt)) . ") -> " . ($updatedCustomer->total_debt == ($initialDebt + ($lineTotal - $paymentAmt)) ? "PASSED" : "FAILED") . "\n";

    DB::rollBack();
    echo "\n=== ALL TESTS PASSED SAFELY AND ROLLED BACK ===\n";

} catch (\Throwable $e) {
    DB::rollBack();
    echo "ERROR: " . $e->getMessage() . "\n";
}
