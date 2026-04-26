<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\CategoryController;

Route::get('/', function () {
    return Inertia::render('Dashboard');
});

Route::resource('categories', CategoryController::class)->except(['create', 'edit', 'show']);
