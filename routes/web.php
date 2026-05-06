<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
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

Route::get('/', function () {
    return Inertia::render('Dashboard');
});

Route::resource('categories', CategoryController::class)->except(['create', 'edit', 'show']);
Route::resource('sizes', SizeController::class)->except(['create', 'edit', 'show']);
Route::resource('price-tiers', PriceTierController::class)->except(['create', 'edit', 'show']);
Route::put('price-tiers/{id}/prices', [PriceTierController::class, 'updatePrices'])->name('price-tiers.prices');
Route::resource('products', ProductController::class)->except(['create', 'edit', 'show']);

Route::resource('users', UserController::class)->except(['create', 'edit', 'show']);
Route::resource('customers', CustomerController::class)->except(['create', 'edit', 'show']);
Route::resource('suppliers', SupplierController::class)->except(['create', 'edit', 'show']);
Route::resource('payment-methods', PaymentMethodController::class)->except(['create', 'edit', 'show']);

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

// Invoices
Route::resource('invoices', InvoiceController::class)->except(['edit']);
Route::get('invoices/{invoice}/edit', [InvoiceController::class, 'edit'])->name('invoices.edit');
Route::post('invoices/{id}/restore', [InvoiceController::class, 'restore'])->name('invoices.restore');

// Payments (Customer)
Route::get('payments', [PaymentController::class, 'index'])->name('payments.index');
Route::get('payments/{id}', [PaymentController::class, 'show'])->name('payments.show');
Route::post('payments', [PaymentController::class, 'store'])->name('payments.store');
Route::delete('payments/{id}', [PaymentController::class, 'destroy'])->name('payments.destroy');

// Settlements (Customer)
Route::get('settlements', [SettlementController::class, 'index'])->name('settlements.index');
Route::get('settlements/{id}', [SettlementController::class, 'show'])->name('settlements.show');
Route::post('settlements', [SettlementController::class, 'store'])->name('settlements.store');
Route::delete('settlements/{id}', [SettlementController::class, 'destroy'])->name('settlements.destroy');

// Invoice Returns
Route::get('invoice-returns', [InvoiceReturnController::class, 'index'])->name('invoice-returns.index');
Route::get('invoice-returns/create', [InvoiceReturnController::class, 'create'])->name('invoice-returns.create');
Route::post('invoice-returns', [InvoiceReturnController::class, 'store'])->name('invoice-returns.store');
Route::get('invoice-returns/{id}', [InvoiceReturnController::class, 'show'])->name('invoice-returns.show');
Route::delete('invoice-returns/{id}', [InvoiceReturnController::class, 'destroy'])->name('invoice-returns.destroy');
Route::post('invoice-returns/{id}/restore', [InvoiceReturnController::class, 'restore'])->name('invoice-returns.restore');
