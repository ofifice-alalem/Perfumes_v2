<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\SizeController;
use App\Http\Controllers\PriceTierController;

Route::get('/', function () {
    return Inertia::render('Dashboard');
});

Route::resource('categories', CategoryController::class)->except(['create', 'edit', 'show']);
Route::resource('sizes', SizeController::class)->except(['create', 'edit', 'show']);
Route::resource('price-tiers', PriceTierController::class)->except(['create', 'edit', 'show']);
Route::put('price-tiers/{id}/prices', [PriceTierController::class, 'updatePrices'])->name('price-tiers.prices');
