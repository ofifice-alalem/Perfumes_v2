<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\SizeController;
use App\Http\Controllers\PriceTierController;
use App\Http\Controllers\ProductController;

Route::get('/', function () {
    return Inertia::render('Dashboard');
});

Route::resource('categories', CategoryController::class)->except(['create', 'edit', 'show']);
Route::resource('sizes', SizeController::class)->except(['create', 'edit', 'show']);
Route::resource('price-tiers', PriceTierController::class)->except(['create', 'edit', 'show']);
Route::put('price-tiers/{id}/prices', [PriceTierController::class, 'updatePrices'])->name('price-tiers.prices');
Route::resource('products', ProductController::class)->except(['create', 'edit', 'show']);
