<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InvoiceReturn;
use App\Models\InvoiceReturnItem;
use App\Models\Payment;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchaseReturn;
use App\Models\PurchaseReturnItem;
use App\Models\Settlement;
use App\Models\SupplierPayment;
use App\Models\SupplierSettlement;
use App\Models\WasteItem;
use App\Models\WasteLog;
use App\Observers\InvoiceItemObserver;
use App\Observers\InvoiceReturnItemObserver;
use App\Observers\PaymentObserver;
use App\Observers\PeriodObserver;
use App\Observers\PurchaseItemObserver;
use App\Observers\PurchaseReturnItemObserver;
use App\Observers\SettlementObserver;
use App\Observers\SupplierPaymentObserver;
use App\Observers\SupplierSettlementObserver;
use App\Observers\WasteItemObserver;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // ─── Period ID auto-fill ──────────────────────────────────────────────
        $periodModels = [
            Invoice::class, InvoiceItem::class,
            InvoiceReturn::class, InvoiceReturnItem::class,
            Payment::class, Settlement::class,
            Purchase::class, PurchaseItem::class,
            PurchaseReturn::class, PurchaseReturnItem::class,
            SupplierPayment::class, SupplierSettlement::class,
            WasteLog::class, WasteItem::class,
        ];

        foreach ($periodModels as $model) {
            $model::observe(PeriodObserver::class);
        }

        // ─── Business logic observers ─────────────────────────────────────────
        InvoiceItem::observe(InvoiceItemObserver::class);
        InvoiceReturnItem::observe(InvoiceReturnItemObserver::class);
        Payment::observe(PaymentObserver::class);
        Settlement::observe(SettlementObserver::class);

        PurchaseItem::observe(PurchaseItemObserver::class);
        PurchaseReturnItem::observe(PurchaseReturnItemObserver::class);
        SupplierPayment::observe(SupplierPaymentObserver::class);
        SupplierSettlement::observe(SupplierSettlementObserver::class);

        WasteItem::observe(WasteItemObserver::class);
    }
}
