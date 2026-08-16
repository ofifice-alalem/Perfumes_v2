<?php

namespace Tests\Feature;

use App\Models\AccountingPeriod;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InventoryLog;
use App\Models\InventoryLogItem;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class InvoiceLifecycleInventoryTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        AccountingPeriod::firstOrCreate(
            ['status' => 'open'],
            ['name' => 'الفترة 1', 'started_at' => now(), 'created_by' => 1]
        );
    }

    private function getAuthenticatedUser(): User
    {
        $user = User::first() ?? User::factory()->create();
        $this->actingAs($user);
        return $user;
    }

    public function test_invoice_creation_records_inventory_log_and_decrements_stock()
    {
        $this->getAuthenticatedUser();

        $category = Category::firstOrCreate(['name' => 'تست 3'], ['is_operational' => false, 'unit' => 'pcs']);
        $product = Product::create([
            'name' => 'عطر الجرد 1',
            'category_id' => $category->id,
            'selling_type' => 'unit_priced',
            'stock' => 20,
            'min_stock' => 1,
        ]);

        ProductPrice::create([
            'product_id' => $product->id,
            'price_per_unit_regular' => 100.00,
            'price_per_unit_vip' => 90.00,
        ]);

        $paymentMethod = PaymentMethod::firstOrCreate(['name' => 'كاش']);

        $payload = [
            'customer_id' => 1,
            'customer_type' => 'regular',
            'items' => [
                [
                    'product_id' => $product->id,
                    'sale_type' => 'unit_based',
                    'quantity' => 5,
                ],
            ],
            'payments' => [
                [
                    'payment_method_id' => $paymentMethod->id,
                    'amount' => 500.00,
                ],
            ],
        ];

        $response = $this->post(route('invoices.store'), $payload);
        $response->assertRedirect(route('invoices.create'));

        $this->assertEquals(15.00, (float)$product->fresh()->stock);

        $log = InventoryLog::where('notes', 'like', '%فاتورة مبيعات%')->latest()->first();
        $this->assertNotNull($log);

        $logItem = InventoryLogItem::where('inventory_log_id', $log->id)
            ->where('product_id', $product->id)
            ->first();

        $this->assertNotNull($logItem);
        $this->assertEquals(20.00, (float)$logItem->system_stock);
        $this->assertEquals(15.00, (float)$logItem->actual_stock);
        $this->assertEquals(-5.00, (float)$logItem->difference);
    }

    public function test_invoice_update_quantity_increase_checks_stock_and_logs()
    {
        $this->getAuthenticatedUser();

        $category = Category::firstOrCreate(['name' => 'تست 3'], ['is_operational' => false, 'unit' => 'pcs']);
        $product = Product::create([
            'name' => 'عطر الجرد 2',
            'category_id' => $category->id,
            'selling_type' => 'unit_priced',
            'stock' => 10,
            'min_stock' => 1,
        ]);

        ProductPrice::create([
            'product_id' => $product->id,
            'price_per_unit_regular' => 100.00,
            'price_per_unit_vip' => 90.00,
        ]);

        $paymentMethod = PaymentMethod::firstOrCreate(['name' => 'كاش']);

        // Create invoice for 3 units (stock drops to 7)
        $payload = [
            'customer_id' => 1,
            'customer_type' => 'regular',
            'items' => [
                ['product_id' => $product->id, 'sale_type' => 'unit_based', 'quantity' => 3],
            ],
        ];
        $this->post(route('invoices.store'), $payload);

        $invoice = Invoice::latest()->first();
        $this->assertEquals(7.00, (float)$product->fresh()->stock);

        // Update invoice to 8 units (net +5 needed, stock is 7, so valid -> stock drops to 2)
        $updatePayload = [
            'customer_id' => 1,
            'customer_type' => 'regular',
            'items' => [
                ['product_id' => $product->id, 'sale_type' => 'unit_based', 'quantity' => 8],
            ],
        ];

        $response = $this->put(route('invoices.update', $invoice->id), $updatePayload);
        $response->assertRedirect(route('invoices.show', $invoice->id));

        $this->assertEquals(2.00, (float)$product->fresh()->stock);

        $updateLog = InventoryLog::where('notes', 'like', '%تعديل فاتورة مبيعات%')->latest()->first();
        $this->assertNotNull($updateLog);

        $logItem = InventoryLogItem::where('inventory_log_id', $updateLog->id)
            ->where('product_id', $product->id)
            ->first();

        $this->assertNotNull($logItem);
        $this->assertEquals(7.00, (float)$logItem->system_stock);
        $this->assertEquals(2.00, (float)$logItem->actual_stock);
        $this->assertEquals(-5.00, (float)$logItem->difference);
    }

    public function test_invoice_cancellation_restores_stock_and_prevents_double_reversal()
    {
        $this->getAuthenticatedUser();

        $category = Category::firstOrCreate(['name' => 'تست 3'], ['is_operational' => false, 'unit' => 'pcs']);
        $product = Product::create([
            'name' => 'عطر إلغاء',
            'category_id' => $category->id,
            'selling_type' => 'unit_priced',
            'stock' => 15,
            'min_stock' => 1,
        ]);

        ProductPrice::create([
            'product_id' => $product->id,
            'price_per_unit_regular' => 200.00,
            'price_per_unit_vip' => 180.00,
        ]);

        $payload = [
            'customer_id' => 1,
            'customer_type' => 'regular',
            'items' => [
                ['product_id' => $product->id, 'sale_type' => 'unit_based', 'quantity' => 4],
            ],
        ];
        $this->post(route('invoices.store'), $payload);

        $invoice = Invoice::latest()->first();
        $this->assertEquals(11.00, (float)$product->fresh()->stock);

        // Cancel invoice
        $response = $this->delete(route('invoices.destroy', $invoice->id));
        $response->assertRedirect(route('invoices.index'));

        // Stock restored back to 15
        $this->assertEquals(15.00, (float)$product->fresh()->stock);

        $cancelLog = InventoryLog::where('notes', 'like', '%إلغاء فاتورة مبيعات%')->latest()->first();
        $this->assertNotNull($cancelLog);

        $logItem = InventoryLogItem::where('inventory_log_id', $cancelLog->id)
            ->where('product_id', $product->id)
            ->first();

        $this->assertNotNull($logItem);
        $this->assertEquals(11.00, (float)$logItem->system_stock);
        $this->assertEquals(15.00, (float)$logItem->actual_stock);
        $this->assertEquals(4.00, (float)$logItem->difference);

        // Attempt second cancellation on deleted invoice -> expect validation error
        $secondCancelResponse = $this->delete(route('invoices.destroy', $invoice->id));
        $secondCancelResponse->assertSessionHasErrors('invoice');
        $this->assertEquals(15.00, (float)$product->fresh()->stock);
    }

    public function test_invoice_update_product_replacement_and_reconciliation()
    {
        $this->getAuthenticatedUser();

        $category = Category::firstOrCreate(['name' => 'تست 3'], ['is_operational' => false, 'unit' => 'pcs']);
        $productA = Product::create([
            'name' => 'عطر أ',
            'category_id' => $category->id,
            'selling_type' => 'unit_priced',
            'stock' => 10,
            'min_stock' => 1,
        ]);
        ProductPrice::create(['product_id' => $productA->id, 'price_per_unit_regular' => 100.00, 'price_per_unit_vip' => 90.00]);

        $productB = Product::create([
            'name' => 'عطر ب',
            'category_id' => $category->id,
            'selling_type' => 'unit_priced',
            'stock' => 10,
            'min_stock' => 1,
        ]);
        ProductPrice::create(['product_id' => $productB->id, 'price_per_unit_regular' => 150.00, 'price_per_unit_vip' => 140.00]);

        // 1. Create invoice with 3 units of Product A
        $this->post(route('invoices.store'), [
            'customer_id' => 1,
            'customer_type' => 'regular',
            'items' => [['product_id' => $productA->id, 'sale_type' => 'unit_based', 'quantity' => 3]],
        ]);

        $invoice = Invoice::latest()->first();
        $this->assertEquals(7.00, (float)$productA->fresh()->stock);
        $this->assertEquals(10.00, (float)$productB->fresh()->stock);

        // 2. Replace Product A with 4 units of Product B and attempt price manipulation (unit_price: 0.01)
        $this->put(route('invoices.update', $invoice->id), [
            'customer_id' => 1,
            'customer_type' => 'regular',
            'items' => [
                ['product_id' => $productB->id, 'sale_type' => 'unit_based', 'quantity' => 4, 'unit_price' => 0.01, 'line_total' => 0.04],
            ],
        ]);

        // Product A stock restored to 10, Product B stock decremented from 10 to 6
        $this->assertEquals(10.00, (float)$productA->fresh()->stock);
        $this->assertEquals(6.00, (float)$productB->fresh()->stock);

        // Authoritative price check for Product B (4 * 150.00 = 600.00)
        $invoice->refresh();
        $this->assertEquals(600.00, (float)$invoice->total);

        // 3. Verify Inventory Reconciliation for Product A and Product B
        $logItemsA = InventoryLogItem::where('product_id', $productA->id)->get();
        $deltaA = $logItemsA->sum('difference'); // -3 from sale, +3 from update replacement = 0 net
        $this->assertEquals(0.0, (float)$deltaA);
        $this->assertEquals(10.00 + $deltaA, (float)$productA->fresh()->stock);

        $logItemsB = InventoryLogItem::where('product_id', $productB->id)->get();
        $deltaB = $logItemsB->sum('difference'); // -4 from update replacement
        $this->assertEquals(-4.0, (float)$deltaB);
        $this->assertEquals(10.00 + $deltaB, (float)$productB->fresh()->stock);
    }
}

