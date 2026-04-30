<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Supplier;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Product;
use App\Models\PaymentMethod;
use App\Models\SupplierPayment;

class PurchaseSeeder extends Seeder
{
    public function run(): void
    {
        // إنشاء موردين
        $supplier1 = Supplier::create([
            'name' => 'شركة العطور الدولية',
            'phone' => '0501111111',
            'email' => 'info@perfumes-intl.com',
            'address' => 'الرياض، المملكة العربية السعودية',
            'is_active' => true,
        ]);

        $supplier2 = Supplier::create([
            'name' => 'محمد العطار',
            'phone' => '0502222222',
            'email' => 'mohammed@attar.com',
            'address' => 'جدة، المملكة العربية السعودية',
            'is_active' => true,
        ]);

        $supplier3 = Supplier::create([
            'name' => 'مؤسسة البخور الفاخر',
            'phone' => '0503333333',
            'address' => 'الدمام، المملكة العربية السعودية',
            'is_active' => true,
        ]);

        // الحصول على بعض المنتجات ووسائل الدفع
        $products = Product::limit(5)->get();
        $paymentMethod = PaymentMethod::first();

        if ($products->count() > 0 && $paymentMethod) {
            // إنشاء فاتورة شراء مكتملة
            $purchase1 = Purchase::create([
                'supplier_id' => $supplier1->id,
                'notes' => 'شحنة العطور الشهرية',
                'total' => 0,
                'paid_amount' => 0,
                'due_amount' => 0,
                'payment_status' => 'unpaid',
            ]);

            // إضافة منتجات للفاتورة
            $totalAmount = 0;
            foreach ($products->take(3) as $index => $product) {
                $quantity = rand(50, 200);
                $unitCost = rand(1, 5) + (rand(0, 99) / 100); // سعر عشوائي بين 1-5 دينار
                $lineTotal = $quantity * $unitCost;
                $totalAmount += $lineTotal;

                PurchaseItem::create([
                    'purchase_id' => $purchase1->id,
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_cost' => $unitCost,
                    'line_total' => $lineTotal,
                ]);

                // تحديث المخزون
                $product->increment('stock', $quantity);
            }

            // تحديث إجماليات الفاتورة
            $purchase1->update([
                'total' => $totalAmount,
                'due_amount' => $totalAmount,
            ]);

            // إضافة دفعة جزئية
            $partialPayment = $totalAmount * 0.6; // دفع 60%
            SupplierPayment::create([
                'purchase_id' => $purchase1->id,
                'payment_method_id' => $paymentMethod->id,
                'amount' => $partialPayment,
                'notes' => 'دفعة أولى',
            ]);

            // إعادة حساب الفاتورة
            $purchase1->recalculate();

            // تحديث دين المورد
            $supplier1->update([
                'total_purchases' => $totalAmount,
                'total_debt' => $totalAmount - $partialPayment,
            ]);

            // إنشاء فاتورة شراء ثانية (غير مدفوعة)
            $purchase2 = Purchase::create([
                'supplier_id' => $supplier2->id,
                'notes' => 'طلبية البخور والوشق',
                'total' => 0,
                'paid_amount' => 0,
                'due_amount' => 0,
                'payment_status' => 'unpaid',
            ]);

            // إضافة منتجات للفاتورة الثانية
            $totalAmount2 = 0;
            foreach ($products->skip(2)->take(2) as $product) {
                $quantity = rand(30, 100);
                $unitCost = rand(2, 8) + (rand(0, 99) / 100);
                $lineTotal = $quantity * $unitCost;
                $totalAmount2 += $lineTotal;

                PurchaseItem::create([
                    'purchase_id' => $purchase2->id,
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_cost' => $unitCost,
                    'line_total' => $lineTotal,
                ]);

                // تحديث المخزون
                $product->increment('stock', $quantity);
            }

            // تحديث إجماليات الفاتورة الثانية
            $purchase2->update([
                'total' => $totalAmount2,
                'due_amount' => $totalAmount2,
            ]);

            // تحديث بيانات المورد الثاني
            $supplier2->update([
                'total_purchases' => $totalAmount2,
                'total_debt' => $totalAmount2,
            ]);
        }
    }
}