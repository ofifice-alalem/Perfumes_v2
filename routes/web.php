<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\SizeController;
use App\Http\Controllers\PriceTierController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\PaymentMethodController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\SupplierPaymentController;
use App\Http\Controllers\SupplierSettlementController;
use App\Http\Controllers\PurchaseReturnController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\SettlementController;
use App\Http\Controllers\InvoiceReturnController;
use App\Http\Controllers\WasteLogController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\BackupController;
use App\Http\Controllers\PeriodController;
use App\Http\Controllers\DashboardController;

use App\Http\Controllers\LicenseController;

// ─── License ─────────────────────────────────────────────────────────────────
Route::get('/license', [LicenseController::class, 'index'])->name('license.index');
Route::post('/license/activate', [LicenseController::class, 'activate'])->name('license.activate');
Route::post('/license/deactivate', [LicenseController::class, 'deactivate'])->name('license.deactivate');
Route::get('/license/developer', [LicenseController::class, 'developer'])->name('license.developer');

// ─── Auth (guest only) ───────────────────────────────────────────────────────
Route::middleware('guest')->group(function () {
    Route::get('login', [LoginController::class, 'create'])->name('login');
    Route::post('login', [LoginController::class, 'store']);
});

Route::post('logout', [LoginController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

// ─── Authenticated ────────────────────────────────────────────────────────────
Route::middleware('auth')->group(function () {

    // Dashboard — super-admin فقط
    Route::get('/', [DashboardController::class, 'index'])->middleware('role:super-admin');

    // ── النسخ الاحتياطية — super-admin فقط ──────────────────────────────────
    Route::middleware('role:super-admin')->prefix('backups')->name('backups.')->group(function () {
        Route::get('/',                    [BackupController::class, 'index'])  ->name('index');
        Route::post('/create',             [BackupController::class, 'create']) ->name('create');
        Route::post('/upload',             [BackupController::class, 'upload']) ->name('upload');
        Route::post('/restore/{filename}', [BackupController::class, 'restore'])->name('restore');
        Route::get('/download/{filename}', [BackupController::class, 'download'])->name('download');
        Route::delete('/{filename}',       [BackupController::class, 'delete']) ->name('delete');
    });

    // ── الفترات المحاسبية — super-admin فقط ─────────────────────────────────
    Route::middleware('role:super-admin')->prefix('periods')->name('periods.')->group(function () {
        Route::get('/',              [PeriodController::class, 'index'])    ->name('index');
        Route::get('/rollover',      [PeriodController::class, 'rollover']) ->name('rollover');
        Route::post('/execute',      [PeriodController::class, 'execute'])  ->name('execute');
        Route::get('/{id}/snapshot', [PeriodController::class, 'snapshot']) ->name('snapshot');
        Route::delete('/{id}/purge', [PeriodController::class, 'purge'])    ->name('purge');
    });

    // ── إدارة النظام — super-admin + admin ──────────────────────────────────
    Route::middleware('role:super-admin|admin')->group(function () {
        Route::resource('categories', CategoryController::class)->except(['create', 'edit', 'show']);
        Route::resource('sizes', SizeController::class)->except(['create', 'edit', 'show']);
        Route::resource('price-tiers', PriceTierController::class)->except(['create', 'edit', 'show']);
        Route::put('price-tiers/{id}/prices', [PriceTierController::class, 'updatePrices'])->name('price-tiers.prices');
        Route::resource('products', ProductController::class)->except(['create', 'edit', 'show']);
        Route::patch('products/{id}/qrcode', [ProductController::class, 'updateQrcode'])->name('products.qrcode');
        Route::resource('payment-methods', PaymentMethodController::class)->except(['create', 'edit', 'show']);
        Route::resource('users', UserController::class)->except(['create', 'edit', 'show']);

        // Reports
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('reports/product-movement', [ReportController::class, 'productMovement'])->name('reports.product-movement');
        Route::get('reports/product-movement/excel', [ReportController::class, 'productMovementExcel'])->name('reports.product-movement.excel');
        Route::get('reports/product-movement/pdf', [ReportController::class, 'productMovementPdf'])->name('reports.product-movement.pdf');
        Route::get('reports/stock-status', [ReportController::class, 'stockStatus'])->name('reports.stock-status');
        Route::get('reports/stock-status/excel', [ReportController::class, 'stockStatusExcel'])->name('reports.stock-status.excel');
        Route::get('reports/stock-status/pdf', [ReportController::class, 'stockStatusPdf'])->name('reports.stock-status.pdf');
        Route::get('reports/customer-aging', [ReportController::class, 'customerAging'])->name('reports.customer-aging');
        Route::get('reports/customer-aging/excel', [ReportController::class, 'customerAgingExcel'])->name('reports.customer-aging.excel');
        Route::get('reports/customer-aging/pdf', [ReportController::class, 'customerAgingPdf'])->name('reports.customer-aging.pdf');
        Route::get('reports/supplier-aging', [ReportController::class, 'supplierAging'])->name('reports.supplier-aging');
        Route::get('reports/supplier-aging/excel', [ReportController::class, 'supplierAgingExcel'])->name('reports.supplier-aging.excel');
        Route::get('reports/supplier-aging/pdf', [ReportController::class, 'supplierAgingPdf'])->name('reports.supplier-aging.pdf');
        Route::get('reports/sales', [ReportController::class, 'sales'])->name('reports.sales');
        Route::get('reports/sales/excel', [ReportController::class, 'salesExcel'])->name('reports.sales.excel');
        Route::get('reports/sales/pdf', [ReportController::class, 'salesPdf'])->name('reports.sales.pdf');
        Route::get('reports/sales/customer-invoices', [ReportController::class, 'salesCustomerInvoices'])->name('reports.sales.customer-invoices');
        Route::get('reports/sales/customer-invoices/excel', [ReportController::class, 'salesCustomerInvoicesExcel'])->name('reports.sales.customer-invoices.excel');
        Route::get('reports/sales/customer-invoices/pdf', [ReportController::class, 'salesCustomerInvoicesPdf'])->name('reports.sales.customer-invoices.pdf');
        Route::get('reports/purchases', [ReportController::class, 'purchases'])->name('reports.purchases');
        Route::get('reports/purchases/excel', [ReportController::class, 'purchasesExcel'])->name('reports.purchases.excel');
        Route::get('reports/purchases/pdf', [ReportController::class, 'purchasesPdf'])->name('reports.purchases.pdf');
        Route::get('reports/purchases/supplier-invoices', [ReportController::class, 'purchasesSupplierInvoices'])->name('reports.purchases.supplier-invoices');
        Route::get('reports/purchases/supplier-invoices/excel', [ReportController::class, 'purchasesSupplierInvoicesExcel'])->name('reports.purchases.supplier-invoices.excel');
        Route::get('reports/purchases/supplier-invoices/pdf', [ReportController::class, 'purchasesSupplierInvoicesPdf'])->name('reports.purchases.supplier-invoices.pdf');
        Route::get('reports/returns', [ReportController::class, 'returns'])->name('reports.returns');
        Route::get('reports/returns/excel', [ReportController::class, 'returnsExcel'])->name('reports.returns.excel');
        Route::get('reports/returns/pdf', [ReportController::class, 'returnsPdf'])->name('reports.returns.pdf');
        Route::get('reports/returns/details', [ReportController::class, 'returnsDetails'])->name('reports.returns.details');
        Route::get('reports/returns/details/excel', [ReportController::class, 'returnsDetailsExcel'])->name('reports.returns.details.excel');
        Route::get('reports/returns/details/pdf', [ReportController::class, 'returnsDetailsPdf'])->name('reports.returns.details.pdf');
    });

    // ── العمليات اليومية — super-admin + admin + saler ───────────────────────────
    Route::middleware('role:super-admin|admin|saler')->group(function () {

        // Customers & Suppliers
        Route::resource('customers', CustomerController::class)->except(['create', 'edit', 'show', 'destroy']);
        Route::resource('suppliers', SupplierController::class)->except(['create', 'edit', 'show', 'destroy']);

        // Purchases
        Route::resource('purchases', PurchaseController::class)->except(['edit']);
        Route::get('purchases/{purchase}/edit', [PurchaseController::class, 'edit'])->name('purchases.edit');
        Route::post('purchases/{id}/restore', [PurchaseController::class, 'restore'])->name('purchases.restore');

        // Supplier Payments
        Route::get('supplier-payments', [SupplierPaymentController::class, 'index'])->name('supplier-payments.index');
        Route::get('supplier-payments/{id}', [SupplierPaymentController::class, 'show'])->name('supplier-payments.show');
        Route::post('supplier-payments', [SupplierPaymentController::class, 'store'])->name('supplier-payments.store');
        Route::delete('supplier-payments/{id}', [SupplierPaymentController::class, 'destroy'])->name('supplier-payments.destroy');

        // Supplier Settlements
        Route::get('supplier-settlements', [SupplierSettlementController::class, 'index'])->name('supplier-settlements.index');
        Route::get('supplier-settlements/{id}', [SupplierSettlementController::class, 'show'])->name('supplier-settlements.show');
        Route::post('supplier-settlements', [SupplierSettlementController::class, 'store'])->name('supplier-settlements.store');
        Route::delete('supplier-settlements/{id}', [SupplierSettlementController::class, 'destroy'])->name('supplier-settlements.destroy');

        // Purchase Returns
        Route::get('purchase-returns', [PurchaseReturnController::class, 'index'])->name('purchase-returns.index');
        Route::get('purchase-returns/create', [PurchaseReturnController::class, 'create'])->name('purchase-returns.create');
        Route::post('purchase-returns', [PurchaseReturnController::class, 'store'])->name('purchase-returns.store');
        Route::get('purchase-returns/{id}', [PurchaseReturnController::class, 'show'])->name('purchase-returns.show');
        Route::delete('purchase-returns/{id}', [PurchaseReturnController::class, 'destroy'])->name('purchase-returns.destroy');
        Route::post('purchase-returns/{id}/restore', [PurchaseReturnController::class, 'restore'])->name('purchase-returns.restore');

        // Waste Logs
        Route::resource('waste-logs', WasteLogController::class)->except(['edit', 'update']);
    });

    // ── عمليات العملاء — super-admin + admin + saler + cashier ────────────────────
    Route::middleware('role:super-admin|admin|saler|cashier')->group(function () {

        // Customers
        Route::resource('customers', CustomerController::class)->except(['create', 'edit', 'show', 'destroy']);

        // Invoices
        Route::resource('invoices', InvoiceController::class)->except(['edit']);
        Route::get('invoices/{invoice}/edit', [InvoiceController::class, 'edit'])->name('invoices.edit');
        Route::post('invoices/{id}/restore', [InvoiceController::class, 'restore'])->name('invoices.restore');

        // Payments (Customer)
        Route::get('payments', [PaymentController::class, 'index'])->name('payments.index');
        Route::get('payments/{id}', [PaymentController::class, 'show'])->name('payments.show');
        Route::post('payments', [PaymentController::class, 'store'])->name('payments.store');
        Route::delete('payments/{id}', [PaymentController::class, 'destroy'])->name('payments.destroy');
        Route::post('payments/{id}/restore', [PaymentController::class, 'restore'])->name('payments.restore');

        // Settlements (Customer)
        Route::get('settlements', [SettlementController::class, 'index'])->name('settlements.index');
        Route::get('settlements/{id}', [SettlementController::class, 'show'])->name('settlements.show');
        Route::post('settlements', [SettlementController::class, 'store'])->name('settlements.store');
        Route::delete('settlements/{id}', [SettlementController::class, 'destroy'])->name('settlements.destroy');
        Route::post('settlements/{id}/restore', [SettlementController::class, 'restore'])->name('settlements.restore');

        // Invoice Returns
        Route::get('invoice-returns', [InvoiceReturnController::class, 'index'])->name('invoice-returns.index');
        Route::get('invoice-returns/create', [InvoiceReturnController::class, 'create'])->name('invoice-returns.create');
        Route::post('invoice-returns', [InvoiceReturnController::class, 'store'])->name('invoice-returns.store');
        Route::get('invoice-returns/{id}', [InvoiceReturnController::class, 'show'])->name('invoice-returns.show');
        Route::delete('invoice-returns/{id}', [InvoiceReturnController::class, 'destroy'])->name('invoice-returns.destroy');
        Route::post('invoice-returns/{id}/restore', [InvoiceReturnController::class, 'restore'])->name('invoice-returns.restore');
    });
});
