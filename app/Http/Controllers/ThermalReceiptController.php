<?php

namespace App\Http\Controllers;

use App\Repositories\Contracts\InvoiceRepositoryInterface;
use App\Repositories\Contracts\SettingRepositoryInterface;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\Size;
use App\Models\User;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\PaymentMethod;

class ThermalReceiptController extends Controller
{
    protected InvoiceRepositoryInterface $invoiceRepo;
    protected SettingRepositoryInterface $settingRepo;

    public function __construct(
        InvoiceRepositoryInterface $invoiceRepo,
        SettingRepositoryInterface $settingRepo
    ) {
        $this->invoiceRepo = $invoiceRepo;
        $this->settingRepo = $settingRepo;
    }

    public function show($id = null)
    {
        $invoice = null;

        if ($id) {
            try {
                $invoice = $this->invoiceRepo->findWithRelations((int)$id);
            } catch (\Throwable $e) {
                $invoice = null;
            }
        }

        if (!$invoice) {
            $invoice = Invoice::with([
                'customer', 
                'user', 
                'items.product', 
                'items.size', 
                'payments.paymentMethod', 
                'settlements'
            ])->latest()->first();
        }

        // Fallback sample invoice in memory for fresh installations with 0 invoices
        if (!$invoice) {
            $invoice = new Invoice([
                'id' => '001',
                'created_at' => now(),
                'total' => 596,
                'paid_amount' => 596,
                'due_amount' => 0,
            ]);
            
            $invoice->setRelation('user', new User(['name' => 'مسؤول النظام']));
            $invoice->setRelation('customer', new Customer(['name' => 'زبون تجريبي']));

            $items = collect([
                new InvoiceItem([
                    'sale_type' => 'unit_based',
                    'quantity' => 3,
                    'unit_price' => 2,
                    'line_total' => 6,
                    'product' => new Product(['name' => 'سواك']),
                ]),
                new InvoiceItem([
                    'sale_type' => 'tier_decant',
                    'quantity' => 40,
                    'unit_price' => 35,
                    'line_total' => 70,
                    'product' => new Product(['name' => 'لاكوست وايت']),
                    'size' => new Size(['label' => 'بخ 35', 'value' => 20]),
                ]),
                new InvoiceItem([
                    'sale_type' => 'unit_decant',
                    'quantity' => 10,
                    'unit_price' => 8,
                    'line_total' => 80,
                    'product' => new Product(['name' => 'بوس داسنت']),
                    'size' => new Size(['label' => '1 ملي', 'value' => 1]),
                ]),
                new InvoiceItem([
                    'sale_type' => 'full_bottle',
                    'quantity' => 90,
                    'unit_price' => 440,
                    'line_total' => 440,
                    'product' => new Product(['name' => 'هيرش لهب']),
                ]),
            ]);
            $invoice->setRelation('items', $items);

            $payments = collect([
                new Payment(['amount' => 50, 'paymentMethod' => new PaymentMethod(['name' => 'نقدي'])]),
                new Payment(['amount' => 506, 'paymentMethod' => new PaymentMethod(['name' => 'بطاقة'])]),
                new Payment(['amount' => 40, 'paymentMethod' => new PaymentMethod(['name' => 'تحويل بنكي'])]),
            ]);
            $invoice->setRelation('payments', $payments);
        }

        $settings = $this->settingRepo->getAll();

        return view('thermal-receipt', compact('invoice', 'settings'));
    }
}
