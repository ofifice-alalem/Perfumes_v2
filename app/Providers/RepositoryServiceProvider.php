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
use App\Repositories\Contracts\PaymentMethodRepositoryInterface;
use App\Repositories\PaymentMethodRepository;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use App\Repositories\InvoiceRepository;
use App\Repositories\Contracts\SupplierRepositoryInterface;
use App\Repositories\SupplierRepository;
use App\Http\Controllers\WasteController;
use App\Repositories\Contracts\WasteRepositoryInterface;
use App\Repositories\WasteRepository;
use App\Repositories\Contracts\PurchaseRepositoryInterface;
use App\Repositories\PurchaseRepository;
use App\Repositories\Contracts\PaymentRepositoryInterface;
use App\Repositories\PaymentRepository;
use App\Repositories\Contracts\SettlementRepositoryInterface;
use App\Repositories\SettlementRepository;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(CategoryRepositoryInterface::class, CategoryRepository::class);
        $this->app->bind(SizeRepositoryInterface::class, SizeRepository::class);
        $this->app->bind(PriceTierRepositoryInterface::class, PriceTierRepository::class);
        $this->app->bind(ProductRepositoryInterface::class, ProductRepository::class);
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
        $this->app->bind(CustomerRepositoryInterface::class, CustomerRepository::class);
        $this->app->bind(PaymentMethodRepositoryInterface::class, PaymentMethodRepository::class);
        $this->app->bind(InvoiceRepositoryInterface::class, InvoiceRepository::class);
        $this->app->bind(SupplierRepositoryInterface::class, SupplierRepository::class);
        $this->app->bind(PurchaseRepositoryInterface::class, PurchaseRepository::class);
        $this->app->bind(WasteRepositoryInterface::class, WasteRepository::class);
        $this->app->bind(PaymentRepositoryInterface::class, PaymentRepository::class);
        $this->app->bind(SettlementRepositoryInterface::class, SettlementRepository::class);
    }
}
