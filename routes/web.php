<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\SizeController;
use App\Http\Controllers\PriceTierController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\PaymentMethodController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\SettlementController;
use App\Http\Controllers\SupplierPaymentController;
use App\Http\Controllers\SupplierSettlementController;

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
Route::resource('payment-methods', PaymentMethodController::class)->except(['create', 'edit', 'show']);
Route::post('invoices/with-items', [InvoiceController::class, 'storeWithItems'])->name('invoices.storeWithItems');
Route::resource('invoices', InvoiceController::class)->except(['edit']);
Route::post('invoices/{id}/items', [InvoiceController::class, 'addItem'])->name('invoices.items.add');
Route::patch('invoices/{id}/items/{itemId}/count', [InvoiceController::class, 'updateItemCount'])->name('invoices.items.updateCount');
Route::delete('invoices/{id}/items/{itemId}', [InvoiceController::class, 'removeItem'])->name('invoices.items.remove');
Route::delete('invoices/{id}/items', [InvoiceController::class, 'removeItems'])->name('invoices.items.removeMany');
Route::post('invoices/{id}/payments', [InvoiceController::class, 'addPayment'])->name('invoices.payments.add');

Route::resource('suppliers', SupplierController::class)->except(['create', 'edit', 'show']);
Route::post('purchases/store-with-items', [PurchaseController::class, 'storeWithItems'])->name('purchases.storeWithItems');
Route::resource('purchases', PurchaseController::class)->except(['edit']);
Route::post('purchases/{id}/items', [PurchaseController::class, 'addItem'])->name('purchases.items.add');
Route::patch('purchases/{id}/items/{itemId}', [PurchaseController::class, 'updateItem'])->name('purchases.items.update');
Route::delete('purchases/{id}/items/{itemId}', [PurchaseController::class, 'removeItem'])->name('purchases.items.remove');
use App\Http\Controllers\WasteController;

Route::post('waste/store-with-items', [WasteController::class, 'storeWithItems'])->name('waste.storeWithItems');
Route::resource('waste', WasteController::class)->except(['edit']);
Route::post('waste/{id}/items', [WasteController::class, 'addItem'])->name('waste.items.add');
Route::patch('waste/{id}/items/{itemId}', [WasteController::class, 'updateItem'])->name('waste.items.update');
Route::delete('waste/{id}/items/{itemId}', [WasteController::class, 'removeItem'])->name('waste.items.remove');

Route::get('payments', [PaymentController::class, 'index'])->name('payments.index');
Route::get('payments/{id}', [PaymentController::class, 'show'])->name('payments.show');
Route::post('payments', [PaymentController::class, 'store'])->name('payments.store');
Route::delete('payments/{id}', [PaymentController::class, 'destroy'])->name('payments.destroy');

Route::get('settlements', [SettlementController::class, 'index'])->name('settlements.index');
Route::get('settlements/{id}', [SettlementController::class, 'show'])->name('settlements.show');
Route::post('settlements', [SettlementController::class, 'store'])->name('settlements.store');
Route::delete('settlements/{id}', [SettlementController::class, 'destroy'])->name('settlements.destroy');

Route::get('supplier-payments', [SupplierPaymentController::class, 'index'])->name('supplier-payments.index');
Route::get('supplier-payments/{id}', [SupplierPaymentController::class, 'show'])->name('supplier-payments.show');
Route::post('supplier-payments', [SupplierPaymentController::class, 'store'])->name('supplier-payments.store');
Route::delete('supplier-payments/{id}', [SupplierPaymentController::class, 'destroy'])->name('supplier-payments.destroy');

Route::get('supplier-settlements', [SupplierSettlementController::class, 'index'])->name('supplier-settlements.index');
Route::get('supplier-settlements/{id}', [SupplierSettlementController::class, 'show'])->name('supplier-settlements.show');
Route::post('supplier-settlements', [SupplierSettlementController::class, 'store'])->name('supplier-settlements.store');
Route::delete('supplier-settlements/{id}', [SupplierSettlementController::class, 'destroy'])->name('supplier-settlements.destroy');
