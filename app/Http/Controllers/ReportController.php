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

        $data = $this->reports->stockStatus($categoryId, $sellingType, $lowStockOnly, $showSold, $showWasted);

        return Inertia::render('Reports/StockStatus', [
            'categories' => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'filters'    => compact('categoryId', 'sellingType', 'lowStockOnly', 'showSold', 'showWasted'),
            'data'       => $data,
        ]);
    }

    public function stockStatusExcel(Request $request)
    {
        $this->reports->exportStockStatusExcel(
            $request->integer('category_id') ?: null,
            $request->input('selling_type'),
            $request->boolean('low_stock_only'),
            $request->boolean('show_sold'),
            $request->boolean('show_wasted'),
        );
    }

    public function stockStatusPdf(Request $request): \Illuminate\Http\Response
    {
        return $this->reports->exportStockStatusPdf(
            $request->integer('category_id') ?: null,
            $request->input('selling_type'),
            $request->boolean('low_stock_only'),
            $request->boolean('show_sold'),
            $request->boolean('show_wasted'),
        );
    }

    public function customerAging(Request $request): Response
    {
        $customerId = $request->integer('customer_id') ?: null;
        $dateFrom   = $request->input('date_from');
        $dateTo     = $request->input('date_to');

        return Inertia::render('Reports/CustomerAging', [
            'customers' => \App\Models\Customer::orderBy('name')->get(['id', 'name']),
            'filters'   => compact('customerId', 'dateFrom', 'dateTo'),
            'data'      => $this->reports->customerAging($customerId, $dateFrom, $dateTo),
        ]);
    }

    public function customerAgingExcel(Request $request)
    {
        $this->reports->exportCustomerAgingExcel(
            $request->integer('customer_id') ?: null,
            $request->input('date_from'),
            $request->input('date_to'),
        );
    }

    public function customerAgingPdf(Request $request): \Illuminate\Http\Response
    {
        return $this->reports->exportCustomerAgingPdf(
            $request->integer('customer_id') ?: null,
            $request->input('date_from'),
            $request->input('date_to'),
        );
    }

    public function supplierAging(Request $request): Response
    {
        $supplierId = $request->integer('supplier_id') ?: null;
        $dateFrom   = $request->input('date_from');
        $dateTo     = $request->input('date_to');

        return Inertia::render('Reports/SupplierAging', [
            'suppliers' => \App\Models\Supplier::orderBy('name')->get(['id', 'name']),
            'filters'   => compact('supplierId', 'dateFrom', 'dateTo'),
            'data'      => $this->reports->supplierAging($supplierId, $dateFrom, $dateTo),
        ]);
    }

    public function supplierAgingExcel(Request $request)
    {
        $this->reports->exportSupplierAgingExcel(
            $request->integer('supplier_id') ?: null,
            $request->input('date_from'),
            $request->input('date_to'),
        );
    }

    public function supplierAgingPdf(Request $request): \Illuminate\Http\Response
    {
        return $this->reports->exportSupplierAgingPdf(
            $request->integer('supplier_id') ?: null,
            $request->input('date_from'),
            $request->input('date_to'),
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
        $compare         = $request->boolean('compare');

        return Inertia::render('Reports/Sales', [
            'users'          => \App\Models\User::orderBy('name')->get(['id', 'name']),
            'customers'      => \App\Models\Customer::orderBy('name')->get(['id', 'name']),
            'paymentMethods' => \App\Models\PaymentMethod::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'categories'     => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'filters'        => compact('dateFrom', 'dateTo', 'userId', 'customerId', 'paymentMethodId', 'categoryId', 'compare'),
            'data'           => $this->reports->sales($dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, $compare),
        ]);
    }

    public function salesExcel(Request $request)
    {
        $this->reports->exportSalesExcel(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('customer_id') ?: null,
            $request->integer('payment_method_id') ?: null,
            $request->integer('category_id') ?: null,
        );
    }

    public function salesPdf(Request $request): \Illuminate\Http\Response
    {
        return $this->reports->exportSalesPdf(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('customer_id') ?: null,
            $request->integer('payment_method_id') ?: null,
            $request->integer('category_id') ?: null,
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

        return Inertia::render('Reports/SalesCustomerInvoices', [
            'users'          => \App\Models\User::orderBy('name')->get(['id', 'name']),
            'customers'      => \App\Models\Customer::orderBy('name')->get(['id', 'name']),
            'paymentMethods' => \App\Models\PaymentMethod::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'categories'     => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'filters'        => compact('dateFrom', 'dateTo', 'userId', 'customerId', 'paymentMethodId', 'categoryId'),
            'data'           => $this->reports->salesCustomerInvoices($dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId),
        ]);
    }

    public function salesCustomerInvoicesExcel(Request $request)
    {
        $this->reports->exportSalesCustomerInvoicesExcel(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('customer_id') ?: null,
            $request->integer('payment_method_id') ?: null,
            $request->integer('category_id') ?: null,
        );
    }

    public function salesCustomerInvoicesPdf(Request $request): \Illuminate\Http\Response
    {
        return $this->reports->exportSalesCustomerInvoicesPdf(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('customer_id') ?: null,
            $request->integer('payment_method_id') ?: null,
            $request->integer('category_id') ?: null,
        );
    }

    public function purchases(Request $request): Response
    {
        $dateFrom   = $request->input('date_from');
        $dateTo     = $request->input('date_to');
        $userId     = $request->integer('user_id') ?: null;
        $supplierId = $request->integer('supplier_id') ?: null;
        $categoryId = $request->integer('category_id') ?: null;
        $compare    = $request->boolean('compare');

        return Inertia::render('Reports/Purchases', [
            'users'      => \App\Models\User::orderBy('name')->get(['id', 'name']),
            'suppliers'  => \App\Models\Supplier::orderBy('name')->get(['id', 'name']),
            'categories' => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'filters'    => compact('dateFrom', 'dateTo', 'userId', 'supplierId', 'categoryId', 'compare'),
            'data'       => $this->reports->purchases($dateFrom, $dateTo, $userId, $supplierId, $categoryId, $compare),
        ]);
    }

    public function purchasesExcel(Request $request)
    {
        $this->reports->exportPurchasesExcel(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('supplier_id') ?: null,
            $request->integer('category_id') ?: null,
        );
    }

    public function purchasesPdf(Request $request): \Illuminate\Http\Response
    {
        return $this->reports->exportPurchasesPdf(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('supplier_id') ?: null,
            $request->integer('category_id') ?: null,
        );
    }

    public function purchasesSupplierInvoices(Request $request): Response
    {
        $dateFrom   = $request->input('date_from');
        $dateTo     = $request->input('date_to');
        $userId     = $request->integer('user_id') ?: null;
        $supplierId = $request->integer('supplier_id') ?: null;
        $categoryId = $request->integer('category_id') ?: null;

        return Inertia::render('Reports/PurchasesSupplierInvoices', [
            'users'      => \App\Models\User::orderBy('name')->get(['id', 'name']),
            'suppliers'  => \App\Models\Supplier::orderBy('name')->get(['id', 'name']),
            'categories' => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'filters'    => compact('dateFrom', 'dateTo', 'userId', 'supplierId', 'categoryId'),
            'data'       => $this->reports->purchasesSupplierInvoices($dateFrom, $dateTo, $userId, $supplierId, $categoryId),
        ]);
    }

    public function purchasesSupplierInvoicesExcel(Request $request)
    {
        $this->reports->exportPurchasesSupplierInvoicesExcel(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('supplier_id') ?: null,
            $request->integer('category_id') ?: null,
        );
    }

    public function purchasesSupplierInvoicesPdf(Request $request): \Illuminate\Http\Response
    {
        return $this->reports->exportPurchasesSupplierInvoicesPdf(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('supplier_id') ?: null,
            $request->integer('category_id') ?: null,
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

        return Inertia::render('Reports/Returns', [
            'users'      => \App\Models\User::orderBy('name')->get(['id', 'name']),
            'customers'  => \App\Models\Customer::orderBy('name')->get(['id', 'name']),
            'suppliers'  => \App\Models\Supplier::orderBy('name')->get(['id', 'name']),
            'categories' => \App\Models\Category::orderBy('name')->get(['id', 'name']),
            'filters'    => compact('dateFrom', 'dateTo', 'userId', 'customerId', 'supplierId', 'categoryId'),
            'data'       => $this->reports->returns($dateFrom, $dateTo, $userId, $customerId, $supplierId, $categoryId),
        ]);
    }

    public function returnsExcel(Request $request)
    {
        $this->reports->exportReturnsExcel(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('customer_id') ?: null,
            $request->integer('supplier_id') ?: null,
            $request->integer('category_id') ?: null,
        );
    }

    public function returnsPdf(Request $request): \Illuminate\Http\Response
    {
        return $this->reports->exportReturnsPdf(
            $request->input('date_from'),
            $request->input('date_to'),
            $request->integer('user_id') ?: null,
            $request->integer('customer_id') ?: null,
            $request->integer('supplier_id') ?: null,
            $request->integer('category_id') ?: null,
        );
    }
}
