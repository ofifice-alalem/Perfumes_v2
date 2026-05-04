<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\Contracts\CategoryRepositoryInterface;
use App\Repositories\CategoryRepository;
use App\Repositories\Contracts\SizeRepositoryInterface;
use App\Repositories\SizeRepository;
use App\Repositories\Contracts\PriceTierRepositoryInterface;
use App\Repositories\PriceTierRepository;
use App\Models\Category;
use App\Models\Size;
use App\Models\PriceTier;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(CategoryRepositoryInterface::class, fn() => new CategoryRepository(new Category()));
        $this->app->bind(SizeRepositoryInterface::class, fn() => new SizeRepository(new Size()));
        $this->app->bind(PriceTierRepositoryInterface::class, fn() => new PriceTierRepository(new PriceTier()));
    }
}
