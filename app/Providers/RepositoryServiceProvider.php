<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\Contracts\CategoryRepositoryInterface;
use App\Repositories\CategoryRepository;
use App\Repositories\Contracts\SizeRepositoryInterface;
use App\Repositories\SizeRepository;
use App\Repositories\Contracts\PriceTierRepositoryInterface;
use App\Repositories\PriceTierRepository;
use App\Repositories\Contracts\ProductRepositoryInterface;
use App\Repositories\ProductRepository;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Repositories\UserRepository;
use App\Repositories\Contracts\CustomerRepositoryInterface;
use App\Repositories\CustomerRepository;
use App\Repositories\Contracts\SupplierRepositoryInterface;
use App\Repositories\SupplierRepository;
use App\Repositories\Contracts\PaymentMethodRepositoryInterface;
use App\Repositories\PaymentMethodRepository;
use App\Repositories\Contracts\PurchaseRepositoryInterface;
use App\Repositories\PurchaseRepository;
use App\Repositories\Contracts\SupplierPaymentRepositoryInterface;
use App\Repositories\SupplierPaymentRepository;
use App\Repositories\Contracts\SupplierSettlementRepositoryInterface;
use App\Repositories\SupplierSettlementRepository;
use App\Repositories\Contracts\PurchaseReturnRepositoryInterface;
use App\Repositories\PurchaseReturnRepository;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use App\Repositories\InvoiceRepository;
use App\Repositories\Contracts\PaymentRepositoryInterface;
use App\Repositories\PaymentRepository;
use App\Repositories\Contracts\SettlementRepositoryInterface;
use App\Repositories\SettlementRepository;
use App\Repositories\Contracts\InvoiceReturnRepositoryInterface;
use App\Repositories\InvoiceReturnRepository;
use App\Repositories\Contracts\WasteLogRepositoryInterface;
use App\Repositories\WasteLogRepository;
use App\Models\Category;
use App\Models\Size;
use App\Models\PriceTier;
use App\Models\Product;
use App\Models\User;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\PaymentMethod;
use App\Models\Purchase;
use App\Models\SupplierPayment;
use App\Models\SupplierSettlement;
use App\Models\PurchaseReturn;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Settlement;
use App\Models\InvoiceReturn;
use App\Models\WasteLog;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(CategoryRepositoryInterface::class, fn() => new CategoryRepository(new Category()));
        $this->app->bind(SizeRepositoryInterface::class, fn() => new SizeRepository(new Size()));
        $this->app->bind(PriceTierRepositoryInterface::class, fn() => new PriceTierRepository(new PriceTier()));
        $this->app->bind(ProductRepositoryInterface::class, fn() => new ProductRepository(new Product()));
        $this->app->bind(UserRepositoryInterface::class, fn() => new UserRepository(new User()));
        $this->app->bind(CustomerRepositoryInterface::class, fn() => new CustomerRepository(new Customer()));
        $this->app->bind(SupplierRepositoryInterface::class, fn() => new SupplierRepository(new Supplier()));
        $this->app->bind(PaymentMethodRepositoryInterface::class, fn() => new PaymentMethodRepository(new PaymentMethod()));
        $this->app->bind(PurchaseRepositoryInterface::class, fn() => new PurchaseRepository(new Purchase()));
        $this->app->bind(SupplierPaymentRepositoryInterface::class, fn() => new SupplierPaymentRepository(new SupplierPayment()));
        $this->app->bind(SupplierSettlementRepositoryInterface::class, fn() => new SupplierSettlementRepository(new SupplierSettlement()));
        $this->app->bind(PurchaseReturnRepositoryInterface::class, fn() => new PurchaseReturnRepository(new PurchaseReturn()));
        $this->app->bind(InvoiceRepositoryInterface::class, fn() => new InvoiceRepository(new Invoice()));
        $this->app->bind(PaymentRepositoryInterface::class, fn() => new PaymentRepository(new Payment()));
        $this->app->bind(SettlementRepositoryInterface::class, fn() => new SettlementRepository(new Settlement()));
        $this->app->bind(InvoiceReturnRepositoryInterface::class, fn() => new InvoiceReturnRepository(new InvoiceReturn()));
        $this->app->bind(WasteLogRepositoryInterface::class, fn() => new WasteLogRepository(new WasteLog()));
    }
}
