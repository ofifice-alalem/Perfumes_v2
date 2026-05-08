<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Repositories\Contracts\ReportRepositoryInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function __construct(private ReportRepositoryInterface $reports) {}

    public function index(): Response
    {
        return Inertia::render('Reports/Index');
    }

    public function productMovement(Request $request): Response
    {
        $productId = $request->integer('product_id');
        $dateFrom  = $request->input('date_from');
        $dateTo    = $request->input('date_to');
        $type      = $request->input('type');

        $data = $productId
            ? $this->reports->productMovement($productId, $dateFrom, $dateTo, $type)
            : null;

        $product = $productId
            ? Product::with('category')->find($productId)
            : null;

        return Inertia::render('Reports/ProductMovement', [
            'products' => Product::with('category')->orderBy('name')->get(['id', 'name', 'stock', 'category_id']),
            'product'  => $product,
            'filters'  => compact('productId', 'dateFrom', 'dateTo', 'type'),
            'data'     => $data,
        ]);
    }
}
