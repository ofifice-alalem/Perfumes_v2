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

// Supplier Payments
Route::get('supplier-payments', [SupplierPaymentController::class, 'index'])->name('supplier-payments.index');
Route::post('supplier-payments', [SupplierPaymentController::class, 'store'])->name('supplier-payments.store');
Route::delete('supplier-payments/{id}', [SupplierPaymentController::class, 'destroy'])->name('supplier-payments.destroy');

// Supplier Settlements
Route::get('supplier-settlements', [SupplierSettlementController::class, 'index'])->name('supplier-settlements.index');
Route::post('supplier-settlements', [SupplierSettlementController::class, 'store'])->name('supplier-settlements.store');
Route::delete('supplier-settlements/{id}', [SupplierSettlementController::class, 'destroy'])->name('supplier-settlements.destroy');

// Purchase Returns
Route::get('purchase-returns', [PurchaseReturnController::class, 'index'])->name('purchase-returns.index');
Route::get('purchase-returns/create', [PurchaseReturnController::class, 'create'])->name('purchase-returns.create');
Route::post('purchase-returns', [PurchaseReturnController::class, 'store'])->name('purchase-returns.store');
Route::get('purchase-returns/{id}', [PurchaseReturnController::class, 'show'])->name('purchase-returns.show');
