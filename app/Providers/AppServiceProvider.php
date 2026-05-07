<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\InvoiceItem;
use App\Models\InvoiceReturnItem;
use App\Models\Payment;
use App\Models\PurchaseItem;
use App\Models\PurchaseReturnItem;
use App\Models\Settlement;
use App\Models\SupplierPayment;
use App\Models\SupplierSettlement;
use App\Models\WasteItem;
use App\Observers\InvoiceItemObserver;
use App\Observers\InvoiceReturnItemObserver;
use App\Observers\PaymentObserver;
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
