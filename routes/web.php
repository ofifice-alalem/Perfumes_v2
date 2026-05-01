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
Route::delete('invoices/{id}/items/{itemId}', [InvoiceController::class, 'removeItem'])->name('invoices.items.remove');
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
