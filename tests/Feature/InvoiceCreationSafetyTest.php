<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\Category;
use App\Models\Customer;
use App\Models\PaymentMethod;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class InvoiceCreationSafetyTest extends TestCase
{
    private function getAuthenticatedUser(): User
    {
        $user = User::where('username', 'admin')->first();
        if (!$user) {
            $user = User::first();
        }
        return $user;
    }

    public function test_price_manipulation_is_prevented(): void
    {
        $user = $this->getAuthenticatedUser();

        // Create test category & product with price 500.00
        $category = Category::firstOrCreate(['name' => 'تست'], ['is_operational' => false, 'unit' => 'pcs']);
        $product = Product::create([
            'name' => 'عطر تست ثغرة الأسعار',
            'category_id' => $category->id,
            'selling_type' => 'unit_based',
            'stock' => 10,
            'min_stock' => 1,
        ]);

        ProductPrice::create([
            'product_id' => $product->id,
            'price_per_unit_regular' => 500.00,
            'price_per_unit_vip' => 450.00,
        ]);

        $pm = PaymentMethod::first() ?? PaymentMethod::create(['name' => 'نقدي']);

        // Attacker attempts to send unit_price = 0.01 and line_total = 0.01
        $payload = [
            'customer_id' => 1,
            'customer_type' => 'regular',
            'items' => [
                [
                    'product_id' => $product->id,
                    'size_id' => null,
                    'sale_type' => 'unit_based',
                    'quantity' => 1,
                    'unit_price' => 0.01,  // UNTRUSTED ATTACK PRICE
                    'line_total' => 0.01,  // UNTRUSTED ATTACK LINE TOTAL
                ]
            ],
            'payments' => [
                [
                    'payment_method_id' => $pm->id,
                    'amount' => 500.00,
                ]
            ]
        ];

        $response = $this->actingAs($user)->post('/invoices', $payload);
        $response->assertStatus(302);

        // Fetch created invoice
        $invoice = Invoice::latest('id')->first();
        $this->assertNotNull($invoice);

        // Verify that server OVERRODE untrusted 0.01 price and set authoritative price 500.00!
        $this->assertEquals('500.00', $invoice->total);

        $item = InvoiceItem::where('invoice_id', $invoice->id)->first();
        $this->assertNotNull($item);
        $this->assertEquals('500.00', $item->unit_price);
        $this->assertEquals('500.00', $item->line_total);

        // Verify stock was decremented from 10 to 9
        $product->refresh();
        $this->assertEquals(9.00, (float)$product->stock);

        // Verify period_id was automatically set on Invoice, InvoiceItem, Payment!
        $this->assertNotNull($invoice->period_id);
        $this->assertNotNull($item->period_id);

        $payment = Payment::where('invoice_id', $invoice->id)->first();
        $this->assertNotNull($payment);
        $this->assertNotNull($payment->period_id);
    }

    public function test_insufficient_stock_is_rejected_and_rolled_back(): void
    {
        $user = $this->getAuthenticatedUser();

        $category = Category::firstOrCreate(['name' => 'تست'], ['is_operational' => false, 'unit' => 'pcs']);
        $product = Product::create([
            'name' => 'عطر كمية محدودة',
            'category_id' => $category->id,
            'selling_type' => 'unit_based',
            'stock' => 5,
            'min_stock' => 1,
        ]);

        ProductPrice::create([
            'product_id' => $product->id,
            'price_per_unit_regular' => 100.00,
            'price_per_unit_vip' => 90.00,
        ]);

        // Attempt to request 6 units when stock is only 5
        $payload = [
            'customer_id' => 1,
            'customer_type' => 'regular',
            'items' => [
                [
                    'product_id' => $product->id,
                    'size_id' => null,
                    'sale_type' => 'unit_based',
                    'quantity' => 6, // Exceeds stock (5)
                    'unit_price' => 100.00,
                    'line_total' => 600.00,
                ]
            ]
        ];

        $response = $this->actingAs($user)->post('/invoices', $payload);
        $response->assertSessionHasErrors('items');

        // Stock must remain 5
        $product->refresh();
        $this->assertEquals(5.00, (float)$product->stock);

        // No invoice created
        $invoice = Invoice::whereHas('items', fn($q) => $q->where('product_id', $product->id))->first();
        $this->assertNull($invoice);
    }
}
