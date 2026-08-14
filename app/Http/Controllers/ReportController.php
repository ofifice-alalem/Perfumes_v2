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

    public function profitAnalysisSummary(Request $request): Response
    {
        $dateFrom        = $request->input('date_from');
        $dateTo          = $request->input('date_to');
        $stockDateFrom   = $request->input('stock_date_from');
        $stockDateTo     = $request->input('stock_date_to');
        $stockCategoryId = $request->integer('stock_category_id') ?: null;
        $productIds      = $request->input('product_ids', []);
        $stockProductIds = $request->input('stock_product_ids', []);
        $searchName      = $request->input('search_name');
        $stockSearchName = $request->input('stock_search_name');
        
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        if (is_string($stockProductIds)) $stockProductIds = explode(',', $stockProductIds);
        
        $productIds = array_filter(array_map('intval', (array)$productIds));
        $stockProductIds = array_filter(array_map('intval', (array)$stockProductIds));

        $hasDailySearch = $request->has('date_from') || $request->has('date_to') || $request->has('product_ids') || $request->has('search_name');
        $hasStockSearch = $request->has('stock_date_from') || $request->has('stock_date_to') || $request->has('stock_category_id') || $request->has('stock_product_ids') || $request->has('stock_search_name');

        if ($hasDailySearch) {
            $dFrom = $dateFrom ?: now()->startOfMonth()->toDateString();
            $dTo   = $dateTo   ?: now()->endOfMonth()->toDateString();
            $cacheKeyDaily = 'profit_daily_' . md5(json_encode([$dFrom, $dTo, $productIds, $searchName]));
            $profitSummary = \Illuminate\Support\Facades\Cache::remember($cacheKeyDaily, now()->addHours(1), function() use ($dFrom, $dTo, $productIds, $searchName) {
                return $this->reports->dailyProfitSummary($dFrom, $dTo, $productIds, null, $searchName);
            });
        } else {
            $profitSummary = ['total_profit' => 0, 'monthly' => [], 'daily' => [], 'included_products' => []];
        }

        if ($hasStockSearch) {
            $sFrom = $stockDateFrom ?: now()->startOfMonth()->toDateString();
            $sTo   = $stockDateTo   ?: now()->endOfMonth()->toDateString();
            $cacheKeyStock = 'profit_stock_' . md5(json_encode([$stockCategoryId, $sFrom, $sTo, $stockProductIds, $stockSearchName]));
            $stockProfitData = \Illuminate\Support\Facades\Cache::remember($cacheKeyStock, now()->addHours(1), function() use ($stockCategoryId, $sFrom, $sTo, $stockProductIds, $stockSearchName) {
                return $this->reports->stockStatus($stockCategoryId, null, false, true, true, true, $sFrom, $sTo, $stockProductIds, null, $stockSearchName);
            });
        } else {
            $stockProfitData = [];
        }

        return Inertia::render('Reports/ProfitAnalysis', [
            'hasDailySearched' => $hasDailySearch,
            'hasStockSearched' => $hasStockSearch,
            'profitSummary'    => $profitSummary,
            'stockProfitData'  => $stockProfitData,
            'categories'       => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'products'         => \App\Models\Product::orderBy('name')->get(['id', 'name']),
            'filters'          => compact('dateFrom', 'dateTo', 'stockDateFrom', 'stockDateTo', 'stockCategoryId', 'productIds', 'stockProductIds', 'searchName', 'stockSearchName') + ['activeTab' => $request->input('active_tab', 'daily')],
        ]);
    }

    public function profitAnalysisExcel(Request $request)
    {
        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        $this->reports->exportProfitAnalysisExcel(
            $request->input('date_from'),
            $request->input('date_to'),
            $productIds,
            $request->input('search_name')
        );
    }

    public function profitAnalysisPdf(Request $request): \Illuminate\Http\Response
    {
        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        return $this->reports->exportProfitAnalysisPdf(
            $request->input('date_from'),
            $request->input('date_to'),
            $productIds,
            $request->input('search_name')
        );
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
            'products' => Product::with('category')->orderBy('name')->get(['id', 'name', 'stock', 'category_id', 'qrcode']),
            'product'  => $product,
            'filters'  => compact('productId', 'dateFrom', 'dateTo', 'type'),
            'data'     => $data,
        ]);
    }

    public function productMovementLoadMore(Request $request): \Illuminate\Http\JsonResponse
    {
        $productId = $request->integer('product_id');
        $offset    = $request->integer('offset', 30);
        $limit     = $request->integer('limit', 30);
        $dateFrom  = $request->input('date_from');
        $dateTo    = $request->input('date_to');
        $type      = $request->input('type');

        if (!$productId) {
            return response()->json(['movements' => [], 'has_more' => false, 'next_offset' => $offset]);
        }

        $result = $this->reports->loadMoreProductMovements(
            $productId,
            $offset,
            $limit,
            $dateFrom,
            $dateTo,
            $type
        );

        return response()->json($result);
    }

    public function productMovementExcel(Request $request)
    {
        $productId = $request->integer('product_id');
        if (!$productId) abort(400);

        $this->reports->exportProductMovementExcel(
            $productId,
            $request->input('date_from'),
            $request->input('date_to'),
            $request->input('type'),
        );
    }

    public function productMovementPdf(Request $request): \Illuminate\Http\Response
    {
        $productId = $request->integer('product_id');
        if (!$productId) abort(400);

        return $this->reports->exportProductMovementPdf(
            $productId,
            $request->input('date_from'),
            $request->input('date_to'),
            $request->input('type'),
        );
    }

    public function stockStatus(Request $request): Response
    {
        $categoryId   = $request->integer('category_id') ?: null;
        $sellingType  = $request->input('selling_type');
        $lowStockOnly = $request->boolean('low_stock_only');
        $showSold     = $request->boolean('show_sold');
        $showWasted   = $request->boolean('show_wasted');
        $showPurchased = $request->boolean('show_purchased');
        $searchName   = $request->input('search_name');

        $dateFrom     = $request->input('date_from');
        $dateTo       = $request->input('date_to');

        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        $data = $this->reports->stockStatus($categoryId, $sellingType, $lowStockOnly, $showSold, $showWasted, $showPurchased, $dateFrom, $dateTo, $productIds, null, $searchName);

        return Inertia::render('Reports/StockStatus', [
            'categories' => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'products'   => Product::with('category')->orderBy('name')->get(['id', 'name', 'stock', 'category_id']),
            'filters'    => compact('categoryId', 'sellingType', 'lowStockOnly', 'showSold', 'showWasted', 'showPurchased', 'dateFrom', 'dateTo', 'productIds', 'searchName'),
            'data'       => $data,
        ]);
    }

    public function stockStatusExcel(Request $request)
    {
        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        $this->reports->exportStockStatusExcel(
            $request->integer('category_id') ?: null,
            $request->input('selling_type'),
            $request->boolean('low_stock_only'),
            $request->boolean('show_sold'),
            $request->boolean('show_wasted'),
            $request->boolean('show_purchased'),
            $request->input('date_from'),
            $request->input('date_to'),
            $request->boolean('compact_view'),
            $productIds,
            $request->input('search_name')
        );
    }

    public function stockStatusPdf(Request $request): \Illuminate\Http\Response
    {
        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        return $this->reports->exportStockStatusPdf(
            $request->integer('category_id') ?: null,
            $request->input('selling_type'),
            $request->boolean('low_stock_only'),
            $request->boolean('show_sold'),
            $request->boolean('show_wasted'),
            $request->boolean('show_purchased'),
            $request->input('date_from'),
            $request->input('date_to'),
            $request->boolean('compact_view'),
            $productIds,
            $request->input('search_name')
        );
    }

    public function inventoryCount(Request $request): Response
    {
        $categoryId   = $request->integer('category_id') ?: null;
        $sellingType  = $request->input('selling_type');
        $lowStockOnly = $request->boolean('low_stock_only');

        $data = $this->reports->stockStatus($categoryId, $sellingType, $lowStockOnly, false, false);

        return Inertia::render('Reports/InventoryCount', [
            'categories' => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'filters'    => compact('categoryId', 'sellingType', 'lowStockOnly'),
            'data'       => $data,
        ]);
    }

    public function inventoryCountExcel(Request $request)
    {
        $this->reports->exportInventoryCountExcel(
            $request->integer('category_id') ?: null,
            $request->input('selling_type'),
            $request->boolean('low_stock_only'),
        );
    }

    public function inventoryCountPdf(Request $request): \Illuminate\Http\Response
    {
        return $this->reports->exportInventoryCountPdf(
            $request->integer('category_id') ?: null,
            $request->input('selling_type'),
            $request->boolean('low_stock_only'),
        );
    }

    public function applyInventoryCount(Request $request): \Illuminate\Http\RedirectResponse
    {
        $items = $request->input('items', []);
        
        $wastedItems = [];
        $purchasedItems = [];

        foreach ($items as $item) {
            $system = (float) $item['system_stock'];
            $actual = (float) $item['actual_stock'];
            
            if ($actual < $system) {
                $wastedItems[] = [
                    'product_id' => $item['product_id'],
                    'quantity'   => $system - $actual,
                    'reason'     => $item['reason'] ?? 'other',
                ];
            } elseif ($actual > $system) {
                $purchasedItems[] = [
                    'product_id' => $item['product_id'],
                    'quantity'   => $actual - $system,
                ];
            }
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($items, $wastedItems, $purchasedItems) {
            $userId = auth()->id() ?? \App\Models\User::first()->id;

            // 0. Save Inventory Log History
            $inventoryLog = \App\Models\InventoryLog::create([
                'user_id' => $userId,
                'notes'   => 'إقفال جرد فعلي',
                'created_at' => now(),
            ]);

            foreach ($items as $item) {
                \App\Models\InventoryLogItem::create([
                    'inventory_log_id' => $inventoryLog->id,
                    'product_id'       => $item['product_id'],
                    'system_stock'     => $item['system_stock'],
                    'actual_stock'     => $item['actual_stock'],
                    'difference'       => $item['actual_stock'] - $item['system_stock'],
                    'reason'           => $item['reason'] ?? null,
                    'created_at'       => now(),
                ]);
            }
            
            // 1. Process Waste
            if (count($wastedItems) > 0) {
                $wasteLog = app(\App\Repositories\Contracts\WasteLogRepositoryInterface::class)->create([
                    'user_id' => $userId,
                    'notes'   => 'تسوية نقص بناء على إقفال الجرد الفعلي (رقم السجل: ' . $inventoryLog->id . ')',
                ]);

                foreach ($wastedItems as $wItem) {
                    \App\Models\WasteItem::create([
                        'waste_log_id' => $wasteLog->id,
                        'product_id'   => $wItem['product_id'],
                        'quantity'     => $wItem['quantity'],
                        'reason'       => $wItem['reason'],
                        'notes'        => 'نقص جرد',
                        'created_at'   => now(),
                    ]);
                }
            }

            // 2. Process Purchase (Inventory Correction)
            if (count($purchasedItems) > 0) {
                $purchase = app(\App\Repositories\Contracts\PurchaseRepositoryInterface::class)->create([
                    'supplier_id'    => 1, // Default System/Cash supplier
                    'user_id'        => $userId,
                    'notes'          => 'تسوية زيادة بناء على إقفال الجرد الفعلي (رقم السجل: ' . $inventoryLog->id . ')',
                    'total'          => 0,
                    'paid_amount'    => 0,
                    'due_amount'     => 0,
                    'payment_status' => 'paid',
                ]);

                foreach ($purchasedItems as $pItem) {
                    \App\Models\PurchaseItem::create([
                        'purchase_id' => $purchase->id,
                        'product_id'  => $pItem['product_id'],
                        'quantity'    => $pItem['quantity'],
                        'unit_cost'   => 0,
                        'line_total'  => 0,
                        'created_at'  => now(),
                    ]);
                }
            }
        });

        return redirect()->route('reports.stock-status')->with('success', 'تم إقفال الجرد وتسوية المخزون بنجاح');
    }

    public function customerAging(Request $request): Response
    {
        $customerId = $request->integer('customer_id') ?: null;
        $dateFrom   = $request->input('date_from');
        $dateTo     = $request->input('date_to');
        $showAllHistory = $request->boolean('show_all_history');

        return Inertia::render('Reports/CustomerAging', [
            'customers' => \App\Models\Customer::orderBy('name')->get(['id', 'name']),
            'filters'   => compact('customerId', 'dateFrom', 'dateTo', 'showAllHistory'),
            'data'      => $this->reports->customerAging($customerId, $dateFrom, $dateTo, $showAllHistory),
        ]);
    }

    public function customerAgingLoadMore(Request $request): \Illuminate\Http\JsonResponse
    {
        $customerId     = $request->integer('customer_id');
        $offset         = $request->integer('offset', 30);
        $limit          = $request->integer('limit', 30);
        $dateFrom       = $request->input('date_from');
        $dateTo         = $request->input('date_to');
        $showAllHistory = $request->boolean('show_all_history');

        $result = $this->reports->loadMoreCustomerMovements(
            $customerId,
            $offset,
            $limit,
            $dateFrom,
            $dateTo,
            $showAllHistory
        );

        return response()->json($result);
    }

    public function customerAgingExcel(Request $request)
    {
        $this->reports->exportCustomerAgingExcel(
            $request->integer('customer_id') ?: null,
            $request->input('date_from'),
            $request->input('date_to'),
            $request->boolean('show_all_history')
        );
    }

    public function customerAgingPdf(Request $request): \Illuminate\Http\Response
    {
        return $this->reports->exportCustomerAgingPdf(
            $request->integer('customer_id') ?: null,
            $request->input('date_from'),
            $request->input('date_to'),
            $request->boolean('show_all_history')
        );
    }

    public function supplierAging(Request $request): Response
    {
        $supplierId = $request->integer('supplier_id') ?: null;
        $dateFrom   = $request->input('date_from');
        $dateTo     = $request->input('date_to');
        $showAllHistory = $request->boolean('show_all_history');

        return Inertia::render('Reports/SupplierAging', [
            'suppliers' => \App\Models\Supplier::orderBy('name')->get(['id', 'name']),
            'filters'   => compact('supplierId', 'dateFrom', 'dateTo', 'showAllHistory'),
            'data'      => $this->reports->supplierAging($supplierId, $dateFrom, $dateTo, $showAllHistory),
        ]);
    }

    public function supplierAgingLoadMore(Request $request): \Illuminate\Http\JsonResponse
    {
        $supplierId     = $request->integer('supplier_id');
        $offset         = $request->integer('offset', 30);
        $limit          = $request->integer('limit', 30);
        $dateFrom       = $request->input('date_from');
        $dateTo         = $request->input('date_to');
        $showAllHistory = $request->boolean('show_all_history');

        $result = $this->reports->loadMoreSupplierMovements(
            $supplierId,
            $offset,
            $limit,
            $dateFrom,
            $dateTo,
            $showAllHistory
        );

        return response()->json($result);
    }

    public function supplierAgingExcel(Request $request)
    {
        $this->reports->exportSupplierAgingExcel(
            $request->integer('supplier_id') ?: null,
            $request->input('date_from'),
            $request->input('date_to'),
            $request->boolean('show_all_history')
        );
    }

    public function supplierAgingPdf(Request $request): \Illuminate\Http\Response
    {
        return $this->reports->exportSupplierAgingPdf(
            $request->integer('supplier_id') ?: null,
            $request->input('date_from'),
            $request->input('date_to'),
            $request->boolean('show_all_history')
        );
    }

    public function sales(Request $request): Response
    {
        $dateFrom        = $request->input('date_from');
        $dateTo          = $request->input('date_to');
        $userId          = $request->integer('user_id') ?: null;
        $customerId      = $request->integer('customer_id') ?: null;
        $paymentMethodId = $request->integer('payment_method_id') ?: null;
        $categoryId      = $request->integer('category_id') ?: null;
        $searchName      = $request->input('search_name');
        $compare         = $request->boolean('compare');

        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        return Inertia::render('Reports/Sales', [
            'users'          => \App\Models\User::orderBy('name')->get(['id', 'name']),
            'customers'      => \App\Models\Customer::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'paymentMethods' => \App\Models\PaymentMethod::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'categories'     => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'products'       => \App\Models\Product::orderBy('name')->get(['id', 'name']),
            'filters'        => compact('dateFrom', 'dateTo', 'userId', 'customerId', 'paymentMethodId', 'categoryId', 'compare', 'productIds', 'searchName'),
            'data'           => $this->reports->sales($dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, $compare, $productIds, $searchName),
        ]);
    }

    public function salesExcel(Request $request)
    {
        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        $this->reports->exportSalesExcel(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('customer_id') ?: null,
            $request->integer('payment_method_id') ?: null,
            $request->integer('category_id') ?: null,
            $productIds,
            $request->input('search_name')
        );
    }

    public function salesPdf(Request $request): \Illuminate\Http\Response
    {
        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        return $this->reports->exportSalesPdf(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('customer_id') ?: null,
            $request->integer('payment_method_id') ?: null,
            $request->integer('category_id') ?: null,
            $productIds,
            $request->input('search_name')
        );
    }

    public function salesCustomerInvoices(Request $request): Response
    {
        $dateFrom        = $request->input('date_from');
        $dateTo          = $request->input('date_to');
        $userId          = $request->integer('user_id') ?: null;
        $customerId      = $request->integer('customer_id') ?: null;
        $paymentMethodId = $request->integer('payment_method_id') ?: null;
        $categoryId      = $request->integer('category_id') ?: null;
        $searchName      = $request->input('search_name');

        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        return Inertia::render('Reports/SalesCustomerInvoices', [
            'includedProducts' => $this->reports->getIncludedProducts($productIds, $searchName),
            'users'          => \App\Models\User::orderBy('name')->get(['id', 'name']),
            'customers'      => \App\Models\Customer::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'paymentMethods' => \App\Models\PaymentMethod::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'categories'     => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'products'       => \App\Models\Product::orderBy('name')->get(['id', 'name']),
            'filters'        => compact('dateFrom', 'dateTo', 'userId', 'customerId', 'paymentMethodId', 'categoryId', 'productIds', 'searchName'),
            'data'           => $this->reports->salesCustomerInvoices($dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, $productIds, $searchName),
        ]);
    }

    public function salesCustomerInvoicesLoadMore(Request $request): \Illuminate\Http\JsonResponse
    {
        $customerId      = $request->integer('customer_id');
        $offset          = $request->integer('offset', 30);
        $limit           = $request->integer('limit', 30);
        $dateFrom        = $request->input('date_from');
        $dateTo          = $request->input('date_to');
        $userId          = $request->integer('user_id') ?: null;
        $paymentMethodId = $request->integer('payment_method_id') ?: null;
        $categoryId      = $request->integer('category_id') ?: null;
        $searchName      = $request->input('search_name');

        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        $result = $this->reports->loadMoreCustomerInvoices(
            $customerId,
            $offset,
            $limit,
            $dateFrom,
            $dateTo,
            $userId,
            $paymentMethodId,
            $categoryId,
            $productIds,
            $searchName
        );

        return response()->json($result);
    }

    public function salesCustomerInvoicesExcel(Request $request)
    {
        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        $this->reports->exportSalesCustomerInvoicesExcel(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('customer_id') ?: null,
            $request->integer('payment_method_id') ?: null,
            $request->integer('category_id') ?: null,
            $productIds,
            $request->input('search_name')
        );
    }

    public function salesCustomerInvoicesPdf(Request $request): \Illuminate\Http\Response
    {
        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        return $this->reports->exportSalesCustomerInvoicesPdf(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('customer_id') ?: null,
            $request->integer('payment_method_id') ?: null,
            $request->integer('category_id') ?: null,
            $productIds,
            $request->input('search_name')
        );
    }

    public function purchases(Request $request): Response
    {
        $dateFrom   = $request->input('date_from');
        $dateTo     = $request->input('date_to');
        $userId     = $request->integer('user_id') ?: null;
        $supplierId = $request->integer('supplier_id') ?: null;
        $categoryId = $request->integer('category_id') ?: null;
        $searchName = $request->input('search_name');
        $compare    = $request->boolean('compare');

        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        return Inertia::render('Reports/Purchases', [
            'includedProducts' => $this->reports->getIncludedProducts($productIds, $searchName),
            'users'      => \App\Models\User::orderBy('name')->get(['id', 'name']),
            'suppliers'  => \App\Models\Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'categories' => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'products'   => \App\Models\Product::orderBy('name')->get(['id', 'name']),
            'filters'    => compact('dateFrom', 'dateTo', 'userId', 'supplierId', 'categoryId', 'compare', 'productIds', 'searchName'),
            'data'       => $this->reports->purchases($dateFrom, $dateTo, $userId, $supplierId, $categoryId, $compare, $productIds, $searchName),
        ]);
    }

    public function purchasesExcel(Request $request)
    {
        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        $this->reports->exportPurchasesExcel(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('supplier_id') ?: null,
            $request->integer('category_id') ?: null,
            $productIds,
            $request->input('search_name')
        );
    }

    public function purchasesPdf(Request $request): \Illuminate\Http\Response
    {
        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        return $this->reports->exportPurchasesPdf(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('supplier_id') ?: null,
            $request->integer('category_id') ?: null,
            $productIds,
            $request->input('search_name')
        );
    }

    public function purchasesSupplierInvoices(Request $request): Response
    {
        $dateFrom   = $request->input('date_from');
        $dateTo     = $request->input('date_to');
        $userId     = $request->integer('user_id') ?: null;
        $supplierId = $request->integer('supplier_id') ?: null;
        $categoryId = $request->integer('category_id') ?: null;
        $searchName = $request->input('search_name');

        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        return Inertia::render('Reports/PurchasesSupplierInvoices', [
            'includedProducts' => $this->reports->getIncludedProducts($productIds, $searchName),
            'users'      => \App\Models\User::orderBy('name')->get(['id', 'name']),
            'suppliers'  => \App\Models\Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'categories' => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'products'   => \App\Models\Product::orderBy('name')->get(['id', 'name']),
            'filters'    => compact('dateFrom', 'dateTo', 'userId', 'supplierId', 'categoryId', 'productIds', 'searchName'),
            'data'       => $this->reports->purchasesSupplierInvoices($dateFrom, $dateTo, $userId, $supplierId, $categoryId, $productIds, $searchName),
        ]);
    }

    public function purchasesSupplierInvoicesLoadMore(Request $request): \Illuminate\Http\JsonResponse
    {
        $supplierId      = $request->integer('supplier_id');
        $offset          = $request->integer('offset', 30);
        $limit           = $request->integer('limit', 30);
        $dateFrom        = $request->input('date_from');
        $dateTo          = $request->input('date_to');
        $userId          = $request->integer('user_id') ?: null;
        $categoryId      = $request->integer('category_id') ?: null;
        $searchName      = $request->input('search_name');

        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        $result = $this->reports->loadMoreSupplierInvoices(
            $supplierId,
            $offset,
            $limit,
            $dateFrom,
            $dateTo,
            $userId,
            $categoryId,
            $productIds,
            $searchName
        );

        return response()->json($result);
    }

    public function purchasesSupplierInvoicesExcel(Request $request)
    {
        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        $this->reports->exportPurchasesSupplierInvoicesExcel(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('supplier_id') ?: null,
            $request->integer('category_id') ?: null,
            $productIds,
            $request->input('search_name')
        );
    }

    public function purchasesSupplierInvoicesPdf(Request $request): \Illuminate\Http\Response
    {
        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        return $this->reports->exportPurchasesSupplierInvoicesPdf(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('supplier_id') ?: null,
            $request->integer('category_id') ?: null,
            $productIds,
            $request->input('search_name')
        );
    }

    public function returns(Request $request): Response
    {
        $dateFrom   = $request->input('date_from');
        $dateTo     = $request->input('date_to');
        $userId     = $request->integer('user_id') ?: null;
        $customerId = $request->integer('customer_id') ?: null;
        $supplierId = $request->integer('supplier_id') ?: null;
        $categoryId = $request->integer('category_id') ?: null;

        $searchName = $request->input('search_name');

        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        return Inertia::render('Reports/Returns', [
            'includedProducts' => $this->reports->getIncludedProducts($productIds, $searchName),
            'users'      => \App\Models\User::orderBy('name')->get(['id', 'name']),
            'customers'  => \App\Models\Customer::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'suppliers'  => \App\Models\Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'categories' => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'products'   => \App\Models\Product::orderBy('name')->get(['id', 'name']),
            'filters'    => compact('dateFrom', 'dateTo', 'userId', 'customerId', 'supplierId', 'categoryId', 'productIds', 'searchName'),
            'data'       => $this->reports->returns($dateFrom, $dateTo, $userId, $customerId, $supplierId, $categoryId, $productIds, $searchName),
        ]);
    }

    public function returnsExcel(Request $request)
    {
        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        $this->reports->exportReturnsExcel(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('customer_id') ?: null,
            $request->integer('supplier_id') ?: null,
            $request->integer('category_id') ?: null,
            $productIds,
            $request->input('search_name')
        );
    }

    public function returnsPdf(Request $request): \Illuminate\Http\Response
    {
        $productIds = $request->input('product_ids', []);
        if (is_string($productIds)) $productIds = explode(',', $productIds);
        $productIds = array_filter(array_map('intval', (array)$productIds));

        return $this->reports->exportReturnsPdf(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('customer_id') ?: null,
            $request->integer('supplier_id') ?: null,
            $request->integer('category_id') ?: null,
            $productIds,
            $request->input('search_name')
        );
    }

    public function returnsDetails(Request $request): Response
    {
        $dateFrom   = $request->input('date_from');
        $dateTo     = $request->input('date_to');
        $userId     = $request->integer('user_id') ?: null;
        $customerId = $request->integer('customer_id') ?: null;
        $supplierId = $request->integer('supplier_id') ?: null;
        $categoryId = $request->integer('category_id') ?: null;
        $type       = $request->input('type', 'all');

        return Inertia::render('Reports/ReturnsDetails', [
            'users'      => \App\Models\User::orderBy('name')->get(['id', 'name']),
            'customers'  => \App\Models\Customer::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'suppliers'  => \App\Models\Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'categories' => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'products'   => \App\Models\Product::orderBy('name')->get(['id', 'name']),
            'filters'    => array_merge(compact('dateFrom', 'dateTo', 'userId', 'customerId', 'supplierId', 'categoryId', 'type'), ['searchName' => $request->input('search_name')]),
            'data'       => $this->reports->returnsDetails($dateFrom, $dateTo, $userId, $customerId, $supplierId, $categoryId, $type, $request->input('search_name')),
        ]);
    }

    public function returnsDetailsExcel(Request $request)
    {
        $this->reports->exportReturnsDetailsExcel(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('customer_id') ?: null,
            $request->integer('supplier_id') ?: null,
            $request->integer('category_id') ?: null,
            $request->input('type', 'all'),
            $request->input('search_name')
        );
    }

    public function returnsDetailsPdf(Request $request): \Illuminate\Http\Response
    {
        return $this->reports->exportReturnsDetailsPdf(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('customer_id') ?: null,
            $request->integer('supplier_id') ?: null,
            $request->integer('category_id') ?: null,
            $request->input('type', 'all'),
            $request->input('search_name')
        );
    }
}
