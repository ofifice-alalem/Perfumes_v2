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

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(CategoryRepositoryInterface::class, CategoryRepository::class);
        $this->app->bind(SizeRepositoryInterface::class, SizeRepository::class);
        $this->app->bind(PriceTierRepositoryInterface::class, PriceTierRepository::class);
        $this->app->bind(ProductRepositoryInterface::class, ProductRepository::class);
    }
}
