<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use App\Repositories\Contracts\InvoiceReturnRepositoryInterface;
use App\Repositories\Contracts\PaymentRepositoryInterface;
use App\Repositories\Contracts\SettlementRepositoryInterface;
use App\Repositories\Contracts\PurchaseRepositoryInterface;
use App\Repositories\Contracts\PurchaseReturnRepositoryInterface;
use App\Repositories\Contracts\SupplierPaymentRepositoryInterface;
use App\Repositories\Contracts\SupplierSettlementRepositoryInterface;
use App\Repositories\Contracts\ProductRepositoryInterface;
use App\Repositories\Contracts\CustomerRepositoryInterface;
use App\Repositories\Contracts\SupplierRepositoryInterface;

class CoreModulesRepositoryTest extends TestCase
{
    public function test_all_operational_repositories_are_bound_in_container(): void
    {
        $this->assertInstanceOf(InvoiceRepositoryInterface::class, app(InvoiceRepositoryInterface::class));
        $this->assertInstanceOf(InvoiceReturnRepositoryInterface::class, app(InvoiceReturnRepositoryInterface::class));
        $this->assertInstanceOf(PaymentRepositoryInterface::class, app(PaymentRepositoryInterface::class));
        $this->assertInstanceOf(SettlementRepositoryInterface::class, app(SettlementRepositoryInterface::class));
        $this->assertInstanceOf(PurchaseRepositoryInterface::class, app(PurchaseRepositoryInterface::class));
        $this->assertInstanceOf(PurchaseReturnRepositoryInterface::class, app(PurchaseReturnRepositoryInterface::class));
        $this->assertInstanceOf(SupplierPaymentRepositoryInterface::class, app(SupplierPaymentRepositoryInterface::class));
        $this->assertInstanceOf(SupplierSettlementRepositoryInterface::class, app(SupplierSettlementRepositoryInterface::class));
        $this->assertInstanceOf(ProductRepositoryInterface::class, app(ProductRepositoryInterface::class));
        $this->assertInstanceOf(CustomerRepositoryInterface::class, app(CustomerRepositoryInterface::class));
        $this->assertInstanceOf(SupplierRepositoryInterface::class, app(SupplierRepositoryInterface::class));
    }

    public function test_invoice_repository_executes_paginated_query(): void
    {
        $repo = app(InvoiceRepositoryInterface::class);
        $result = $repo->paginated(10);
        $this->assertNotNull($result);
    }

    public function test_purchase_repository_executes_paginated_query(): void
    {
        $repo = app(PurchaseRepositoryInterface::class);
        $result = $repo->paginated(10);
        $this->assertNotNull($result);
    }

    public function test_customer_and_supplier_repositories_retrieve_records(): void
    {
        $customerRepo = app(CustomerRepositoryInterface::class);
        $supplierRepo = app(SupplierRepositoryInterface::class);

        $this->assertNotNull($customerRepo->all());
        $this->assertNotNull($supplierRepo->all());
    }
}
