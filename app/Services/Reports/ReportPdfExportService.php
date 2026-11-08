<?php

namespace App\Services\Reports;

use App\Repositories\Contracts\ReportRepositoryInterface;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use ArPHP\I18N\Arabic;

class ReportPdfExportService
{
    public function exportProductMovementPdf(ReportRepositoryInterface $repo, int $productId, ?string $dateFrom, ?string $dateTo, ?string $type, ?int $limit = 500, ?int $offset = 0): \Illuminate\Http\Response
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $arabic = new \ArPHP\I18N\Arabic();
        $g = fn(string $text) => $arabic->utf8Glyphs($text);

        $product = DB::table('products')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->where('products.id', $productId)
            ->select('products.name', 'categories.unit')
            ->first();

        $data = $repo->productMovement($productId, $dateFrom, $dateTo, $type, null);
        $allMovements = $data['movements'] ?? [];
        $totalMovements = count($allMovements);

        $limitVal = ($limit && $limit > 0) ? $limit : 500;
        $offsetVal = ($offset && $offset >= 0) ? $offset : 0;
        $slicedMovements = array_slice($allMovements, $offsetVal, $limitVal);

        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $typeLabels = [
            'purchase'   => 'شراء',
            'sale'       => 'بيع',
            'return_in'  => 'مرتجع عميل',
            'return_out' => 'مرتجع مورد',
            'waste'      => 'تالف',
            'opening_balance' => 'رصيد افتتاحي',
        ];

        $batchText = $totalMovements > $limitVal 
            ? $g('الدفعة: ' . ($offsetVal + 1) . ' - ' . min($offsetVal + count($slicedMovements), $totalMovements) . ' من إجمالي ' . $totalMovements . ' حركة')
            : null;

        $labels = [
            'title'               => $g('تقرير حركة المنتج'),
            'product_name'        => $g($product->name ?? ''),
            'unit'                => $product->unit ?? '',
            'date_from'           => $dateFrom,
            'date_to'             => $dateTo,
            'all_dates'           => $g('جميع التواريخ'),
            'opening_stock'       => $g('رصيد أول الفترة'),
            'closing_stock'       => $g('رصيد آخر الفترة'),
            'movements_count'     => $g('عدد حركات الدفعة'),
            'opening_val'         => $fmtN($data['opening_stock']),
            'closing_val'         => $fmtN($data['closing_stock']),
            'movements_val'       => count($slicedMovements),
            'filter_info'         => $g('معلومات التقرير'),
            'label_product'       => $g('المنتج'),
            'label_period'        => $g('الفترة'),
            'label_type'          => $g('نوع الحركة'),
            'summary_label'       => $g('ملخص'),
            'movement_type_label' => $g($type ? ($typeLabels[$type] ?? 'جميع الحركات') : 'جميع الحركات'),
            'col_date'            => $g('التاريخ'),
            'col_type'            => $g('النوع'),
            'col_qty'             => $g('الكمية'),
            'col_price'           => $g('السعر'),
            'col_ref'             => $g('المرجع'),
            'col_balance'         => $g('الرصيد'),
            'batch_info'          => $batchText,
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.product-movement-pdf', [
            'labels'     => $labels,
            'movements'  => $slicedMovements,
            'offset'     => $offsetVal,
            'typeLabels' => $typeLabels,
            'g'          => $g,
        ])
        ->setPaper('a4')
        ->setOption('isHtml5ParserEnabled', true)
        ->setOption('isFontSubsettingEnabled', true);

        $suffix = $batchText ? '-batch-' . (floor($offsetVal / $limitVal) + 1) : '';
        return $pdf->stream('product-movement-' . now()->format('Y-m-d') . $suffix . '.pdf');
    }

    // ─── Stock Status ──────────────────────────────────────────────────────────


    public function exportStockStatusPdf(ReportRepositoryInterface $repo, ?int $categoryId, ?string $sellingType, bool $lowStockOnly, bool $showSold = false, bool $showWasted = false, bool $showPurchased = false, ?string $dateFrom = null, ?string $dateTo = null, bool $compactView = false, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $arabic = new \ArPHP\I18N\Arabic();
        $g = fn(string $text) => $arabic->utf8Glyphs($text);

        $data    = $repo->stockStatus($categoryId, $sellingType, $lowStockOnly, $showSold, $showWasted, $showPurchased, $dateFrom, $dateTo, $filterProductIds, null, $searchName);
        
        if ($compactView) {
            $data = array_values(array_filter($data, fn($item) => $item['profit'] !== null));
        }

        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $n !== null ? ($isWhole($n) ? number_format($n, 0) : number_format($n, 2)) : '—';

        $statusLabels = ['ok' => 'جيد', 'warning' => 'تحذير', 'critical' => 'حرج'];

        $productNames = (!empty($filterProductIds) || !empty($searchName) || $compactView) ? collect($data)->pluck('name')->toArray() : [];
        $categoryName = $categoryId ? DB::table('categories')->where('id', $categoryId)->value('name') : null;

        $totalProfit = null;
        if ($showPurchased) {
            $totalProfit = array_reduce($data, fn($carry, $item) => $carry + (float)($item['profit'] ?? 0), 0.0);
        }

        $labels = [
            'title'          => $g($showPurchased ? 'تقرير الأرباح' : 'تقرير المخزون الحالي'),
            'generated_at'   => now()->format('Y-m-d H:i'),
            'date_from_val'  => $dateFrom ?: $g('البداية'),
            'date_to_val'    => $dateTo ?: $g('النهاية'),
            'products_val'   => !empty($productNames) ? array_map($g, $productNames) : [],
            'category_val'   => $categoryName ? $g($categoryName) : $g('الكل'),
            'label_category' => $g('التصنيف'),
            'label_type'     => $g('نوع المنتج'),
            'label_filter'   => $g('الفلتر'),
            'all_label'      => $g('الكل'),
            'low_stock_label'=> $g($lowStockOnly ? 'تحت الحد الأدنى فقط' : 'جميع المنتجات'),
            'summary_label'  => $g('ملخص'),
            'total_products' => count($data),
            'ok_count'       => count(array_filter($data, fn($p) => $p['status'] === 'ok')),
            'warning_count'  => count(array_filter($data, fn($p) => $p['status'] === 'warning')),
            'critical_count' => count(array_filter($data, fn($p) => $p['status'] === 'critical')),
            'col_name'       => $g('المنتج'),
            'col_category'   => $g('التصنيف'),
            'col_stock'      => $g('المخزون'),
            'col_min'        => $g('الحد الأدنى'),
            'col_status'     => $g('الحالة'),
            'col_cost'       => $g('آخر شراء'),
            'col_avg_cost'   => $g('متوسط شراء'),
            'col_price'      => $g('آخر بيع'),
            'col_avg_price'  => $g('متوسط بيع'),
            'col_sold'       => $g('إجمالي المبيع'),
            'col_wasted'     => $g('إجمالي التالف'),
            'col_profit'     => $g('الربح'),
            'col_net_qty'    => $g('صافي البيع'),
            'show_sold'      => $showSold,
            'show_wasted'    => $showWasted,
            'show_purchased' => $showPurchased,
            'compact_view'   => $compactView,
            'total_profit'   => $totalProfit,
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.stock-status-pdf', [
            'labels'       => $labels,
            'data'         => $data,
            'statusLabels' => $statusLabels,
            'g'            => $g,
            'fmtN'         => $fmtN,
        ])
        ->setPaper($showPurchased && !$compactView ? 'a4' : 'a4', $showPurchased && !$compactView ? 'landscape' : 'portrait')
        ->setOption('isHtml5ParserEnabled', true)
        ->setOption('isFontSubsettingEnabled', true);

        return $pdf->stream('stock-status-' . now()->format('Y-m-d') . '.pdf');
    }

    // ─── Inventory Count (الجرد) ────────────────────────────────────────────────
    

    public function exportInventoryCountPdf(ReportRepositoryInterface $repo, ?int $categoryId, ?string $sellingType, bool $lowStockOnly): \Illuminate\Http\Response
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $arabic = new \ArPHP\I18N\Arabic();
        $g = fn(string $text) => $arabic->utf8Glyphs($text);

        $data    = $repo->stockStatus($categoryId, $sellingType, $lowStockOnly, false, false, false);
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $n !== null ? ($isWhole($n) ? number_format($n, 0) : number_format($n, 2)) : '—';

        $labels = [
            'title'          => $g('نموذج الجرد الفعلي'),
            'generated_at'   => now()->format('Y-m-d H:i'),
            'filter_info'    => $g('معلومات التقرير'),
            'label_category' => $g('التصنيف'),
            'label_type'     => $g('نوع المنتج'),
            'label_filter'   => $g('الفلتر'),
            'all_label'      => $g('الكل'),
            'low_stock_label'=> $g($lowStockOnly ? 'تحت الحد الأدنى فقط' : 'جميع المنتجات'),
            'summary_label'  => $g('ملخص'),
            'total_products' => count($data),
            'col_name'       => $g('المنتج'),
            'col_category'   => $g('التصنيف'),
            'col_stock'      => $g('المخزون النظامي'),
            'col_actual'     => $g('المخزون الفعلي'),
            'col_notes'      => $g('ملاحظات'),
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.inventory-count-pdf', [
            'labels'       => $labels,
            'data'         => $data,
            'g'            => $g,
            'fmtN'         => $fmtN,
        ])
        ->setPaper('a4')
        ->setOption('isHtml5ParserEnabled', true)
        ->setOption('isFontSubsettingEnabled', true);

        return $pdf->stream('inventory-count-' . now()->format('Y-m-d') . '.pdf');
    }

    // ─── Customer Aging ────────────────────────────────────────────────────────


    public function exportCustomerAgingPdf(ReportRepositoryInterface $repo, ?int $customerId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false): \Illuminate\Http\Response
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);

        $arabic = new \ArPHP\I18N\Arabic();
        $g = fn(string $text) => $arabic->utf8Glyphs($text);

        $data    = $repo->customerAging($customerId, $dateFrom, $dateTo, $showAllHistory, null);
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $totalDebt   = array_sum(array_column($data, 'total_debt'));
        $totalOver90 = array_sum(array_column($data, 'over_90'));

        $customerName = $customerId
            ? DB::table('customers')->where('id', $customerId)->value('name')
            : null;

        $labels = [
            'title'          => $g('تقرير ديون العملاء'),
            'generated_at'   => now()->format('Y-m-d H:i'),
            'filter_info'    => $g('معلومات التقرير'),
            'summary_label'  => $g('ملخص'),
            'label_customer' => $g('العميل'),
            'customer_val'   => $customerName ? $g($customerName) : $g('جميع العملاء'),
            'label_date_from'=> $g('من تاريخ'),
            'date_from_val'  => $dateFrom ? substr($dateFrom, 0, 10) : '—',
            'date_to_label'  => $g('إلى تاريخ'),
            'date_to_val'    => $dateTo ? substr($dateTo, 0, 10) : now()->format('Y-m-d'),
            'customers_count'=> count($data),
            'total_debt'     => $fmtN($totalDebt),
            'total_over90'   => $fmtN($totalOver90),
            'col_customer'   => $g('العميل'),
            'col_total'      => $g('إجمالي الدين'),
            'col_breakdown'  => $g('فواتير/دفعات/مرتجعات'),
            'col_current'    => $g('أقل') . ' 30 ' . $g('يوم'),
            'col_30_60'      => '30-60 ' . $g('يوم'),
            'col_60_90'      => '60-90 ' . $g('يوم'),
            'col_over90'     => $g('أكثر') . ' 90 ' . $g('يوم'),
            'col_invoices'   => $g('الحركات'),
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.customer-aging-pdf', [
            'labels' => $labels,
            'data'   => $data,
            'g'      => $g,
            'fmtN'   => $fmtN,
        ])
        ->setPaper('a4')
        ->setOption('isHtml5ParserEnabled', true)
        ->setOption('isFontSubsettingEnabled', true);

        return $pdf->stream('customer-aging-' . now()->format('Y-m-d') . '.pdf');
    }

    // ─── Supplier Aging ────────────────────────────────────────────────────


    public function exportSupplierAgingPdf(ReportRepositoryInterface $repo, ?int $supplierId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false): \Illuminate\Http\Response
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);

        $arabic = new \ArPHP\I18N\Arabic();
        $g = fn(string $text) => $arabic->utf8Glyphs($text);

        $data    = $repo->supplierAging($supplierId, $dateFrom, $dateTo, $showAllHistory, null);
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $totalDebt   = array_sum(array_column($data, 'total_debt'));
        $totalOver90 = array_sum(array_column($data, 'over_90'));

        $supplierName = $supplierId
            ? DB::table('suppliers')->where('id', $supplierId)->value('name')
            : null;

        $labels = [
            'title'           => $g('تقرير ديون الموردين'),
            'generated_at'    => now()->format('Y-m-d H:i'),
            'filter_info'     => $g('معلومات التقرير'),
            'summary_label'   => $g('ملخص'),
            'label_supplier'  => $g('المورد'),
            'supplier_val'    => $supplierName ? $g($supplierName) : $g('جميع الموردين'),
            'label_date_from' => $g('من تاريخ'),
            'date_from_val'   => $dateFrom ? substr($dateFrom, 0, 10) : '—',
            'date_to_label'   => $g('إلى تاريخ'),
            'date_to_val'     => $dateTo ? substr($dateTo, 0, 10) : now()->format('Y-m-d'),
            'suppliers_count' => count($data),
            'total_debt'      => $fmtN($totalDebt),
            'total_over90'    => $fmtN($totalOver90),
            'col_supplier'    => $g('المورد'),
            'col_total'       => $g('إجمالي الدين'),
            'col_current'     => $g('أقل') . ' 30 ' . $g('يوم'),
            'col_30_60'       => '30-60 ' . $g('يوم'),
            'col_60_90'       => '60-90 ' . $g('يوم'),
            'col_over90'      => $g('أكثر') . ' 90 ' . $g('يوم'),
            'col_invoices'    => $g('الحركات'),
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.supplier-aging-pdf', [
            'labels' => $labels,
            'data'   => $data,
            'g'      => $g,
            'fmtN'   => $fmtN,
        ])
        ->setPaper('a4')
        ->setOption('isHtml5ParserEnabled', true)
        ->setOption('isFontSubsettingEnabled', true);

        return $pdf->stream('supplier-aging-' . now()->format('Y-m-d') . '.pdf');
    }


    public function exportSalesPdf(ReportRepositoryInterface $repo, ?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $arabic = new \ArPHP\I18N\Arabic();
        $g = fn(string $text) => $arabic->utf8Glyphs($text);

        $data    = $repo->sales($dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, false, $filterProductIds, $searchName);
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $productNames = collect($data['includedProducts'] ?? [])->pluck('name')->toArray();

        $userName          = $userId ? DB::table('users')->where('id', $userId)->value('name') : null;
        $customerName      = $customerId ? DB::table('customers')->where('id', $customerId)->value('name') : null;
        $paymentMethodName = $paymentMethodId ? DB::table('payment_methods')->where('id', $paymentMethodId)->value('name') : null;
        $categoryName      = $categoryId ? DB::table('categories')->where('id', $categoryId)->value('name') : null;

        $labels = [
            'title'                => $g('تقرير المبيعات'),
            'generated_at'         => now()->format('Y-m-d H:i'),
            'filter_info'          => $g('معلومات وفلاتر التقرير'),
            'summary_label'        => $g('الملخص المالي'),
            'products_val'         => !empty($productNames) ? array_map($g, $productNames) : [],
            'search_name_val'      => $searchName ? $g($searchName) : null,
            'label_date_from'      => $g('من تاريخ'),
            'date_from_val'        => $dateFrom ?: '—',
            'date_to_label'        => $g('إلى تاريخ'),
            'date_to_val'          => $dateTo ?? now()->format('Y-m-d'),
            'label_user'           => $g('البائع'),
            'user_val'             => $userName ? $g($userName) : $g('الكل'),
            'label_customer'       => $g('العميل'),
            'customer_val'         => $customerName ? $g($customerName) : $g('الكل'),
            'label_payment_method' => $g('وسيلة الدفع'),
            'payment_method_val'   => $paymentMethodName ? $g($paymentMethodName) : $g('الكل'),
            'label_category'       => $g('التصنيف'),
            'category_val'         => $categoryName ? $g($categoryName) : $g('الكل'),
            'total_sales'          => $fmtN($data['totalSales']),
            'invoices_count'       => $data['invoicesCount'],
            'avg_invoice'          => $fmtN($data['avgInvoice']),
            'total_paid'           => $fmtN($data['totalPaid']),
            'total_due'            => $fmtN($data['totalDue']),
            'pm_section_title'     => $g('تفصيل وسائل الدفع والتحصيل'),
            'pm_col_name'          => $g('وسيلة الدفع'),
            'pm_col_count'         => $g('عدد العمليات'),
            'pm_col_amount'        => $g('إجمالي المبلغ'),
            'pm_col_pct'           => $g('النسبة %'),
            'col_date'             => $g('التاريخ'),
            'col_month'            => $g('الشهر'),
            'col_count'            => $g('عدد الفواتير'),
            'col_total'            => $g('إجمالي المبيعات'),
            'lbl_total'            => $g('إجمالي المبيعات'),
            'lbl_count'            => $g('عدد الفواتير'),
            'lbl_avg'              => $g('متوسط الفاتورة'),
            'lbl_paid'             => $g('إجمالي المدفوع'),
            'lbl_due'              => $g('إجمالي المتبقي'),
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.sales-pdf', [
            'labels' => $labels,
            'data'   => $data,
            'g'      => $g,
            'fmtN'   => $fmtN,
        ])
        ->setPaper('a4')
        ->setOption('isHtml5ParserEnabled', true)
        ->setOption('isFontSubsettingEnabled', true);

        return $pdf->stream('sales-' . now()->format('Y-m-d') . '.pdf');
    }

    // ─── Sales Customer Invoices ───────────────────────────────────────────────


    public function exportSalesCustomerInvoicesPdf(ReportRepositoryInterface $repo, ?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null, ?int $limit = 500, ?int $offset = 0): \Illuminate\Http\Response
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $arabic = new \ArPHP\I18N\Arabic();
        $g  = fn($text) => $arabic->utf8Glyphs($text);
        $en = fn($str)  => str_replace(['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'], ['0','1','2','3','4','5','6','7','8','9'], $str);

        $data    = $repo->salesCustomerInvoices($dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, $filterProductIds, $searchName, $limit ?? 500, $offset ?? 0);
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $includedProducts = $repo->getIncludedProducts($filterProductIds, $searchName);
        $productNames = collect($includedProducts)->pluck('name')->toArray();

        $userName          = $userId ? DB::table('users')->where('id', $userId)->value('name') : null;
        $customerName      = $customerId ? DB::table('customers')->where('id', $customerId)->value('name') : null;
        $paymentMethodName = $paymentMethodId ? DB::table('payment_methods')->where('id', $paymentMethodId)->value('name') : null;
        $categoryName      = $categoryId ? DB::table('categories')->where('id', $categoryId)->value('name') : null;

        $grandAmount = array_sum(array_column($data, 'total_amount'));
        $grandCount  = array_sum(array_column($data, 'invoice_count'));
        $totalPaid   = array_sum(array_column($data, 'total_paid'));
        $totalDue    = array_sum(array_column($data, 'total_due'));

        $paymentMethodsBreakdown = $repo->getSalesPaymentMethodsBreakdown($dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, $filterProductIds, $searchName, (float)$totalPaid);

        $entries = array_map(function ($entry) use ($g, $en, $fmtN) {
            return [
                'name'          => $en($g($entry['customer_name'])),
                'invoice_count' => $entry['invoice_count'],
                'total_amount'  => $entry['total_amount'],
                'total_paid'    => $entry['total_paid'] ?? 0,
                'total_due'     => $entry['total_due'] ?? 0,
                'invoices'      => array_map(fn($inv) => [
                    'id'          => $inv['id'],
                    'date'        => substr($inv['date'], 0, 10),
                    'total'       => $inv['total'],
                    'paid_amount' => $inv['paid_amount'] ?? 0,
                    'due_amount'  => $inv['due_amount'] ?? 0,
                    'items'       => array_map(fn($i) => [
                        'product_name' => $en($g(is_array($i) ? $i['product_name'] : $i->product_name)),
                        'quantity'     => is_array($i) ? $i['quantity'] : $i->quantity,
                        'unit_price'   => is_array($i) ? $i['unit_price'] : $i->unit_price,
                        'count'        => is_array($i) ? ($i['count'] ?? 1) : ($i->count ?? 1),
                        'line_total'   => is_array($i) ? $i['line_total'] : $i->line_total,
                        'is_matched'   => is_array($i) ? ($i['is_matched'] ?? false) : ($i->is_matched ?? false),
                    ], $inv['items']),
                ], $entry['invoices']),
            ];
        }, $data);

        $matchedTotal = 0;
        foreach ($data as $entry) {
            foreach ($entry['invoices'] as $inv) {
                foreach ($inv['items'] as $item) {
                    $itemArray = (array) $item;
                    if (!empty($itemArray['is_matched'])) {
                        $matchedTotal += (float) $itemArray['line_total'];
                    }
                }
            }
        }

        $labels = [
            'title'                => $g('فواتير العملاء التفصيلية'),
            'dateFrom'             => $dateFrom ?: '—',
            'dateTo'               => $dateTo ?? now()->format('Y-m-d'),
            'products_val'         => !empty($productNames) ? array_map($g, $productNames) : [],
            'search_name_val'      => $searchName ? $g($searchName) : null,
            'labelFrom'            => $g('من تاريخ'),
            'labelTo'              => $g('إلى تاريخ'),
            'generatedAt'          => now()->format('Y-m-d H:i'),
            'generatedLabel'       => $g('تاريخ الإنشاء'),
            'filterUser'           => $userName ? $en($g($userName)) : $g('الكل'),
            'filterCustomer'       => $customerName ? $en($g($customerName)) : $g('الكل'),
            'filterPayment'        => $paymentMethodName ? $en($g($paymentMethodName)) : $g('الكل'),
            'filterCategory'       => $categoryName ? $en($g($categoryName)) : $g('الكل'),
            'labelUser'            => $g('البائع'),
            'labelCustomer'        => $g('العميل'),
            'labelPayment'         => $g('وسيلة الدفع'),
            'labelCategory'        => $g('التصنيف'),
            'grandAmount'          => $grandAmount,
            'grandCount'           => $grandCount,
            'totalPaid'            => $totalPaid,
            'totalDue'             => $totalDue,
            'customersCount'       => count($data),
            'avgInvoice'           => $grandCount > 0 ? $grandAmount / $grandCount : 0,
            'pm_section_title'     => $g('تفصيل وسائل الدفع والتحصيل'),
            'pm_col_name'          => $g('وسيلة الدفع'),
            'pm_col_count'         => $g('عدد العمليات'),
            'pm_col_amount'        => $g('إجمالي المبلغ'),
            'pm_col_pct'           => $g('النسبة %'),
            'product'              => $g('المنتج'),
            'qty'                  => $g('الحجم'),
            'count_label'          => $g('العدد'),
            'price'                => $g('السعر'),
            'amount'               => $g('المبلغ'),
            'total'                => $g('الإجمالي'),
            'paid_label'           => $g('المدفوع'),
            'due_label'            => $g('المتبقي'),
            'invoices_label'       => $g('عدد الفواتير'),
            'customers_label'      => $g('عدد العملاء'),
            'date_label'           => $g('التاريخ'),
            'matchedTotal'         => $matchedTotal,
            'matchedTotalLabel'    => $g('إجمالي نتائج البحث'),
            'totalPages'           => 1,
        ];

        $options = ['isRemoteEnabled' => false, 'isHtml5ParserEnabled' => true, 'isFontSubsettingEnabled' => true, 'compress' => 1, 'dpi' => 96];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.sales-customer-invoices-pdf', compact('entries', 'labels', 'fmtN', 'g', 'paymentMethodsBreakdown'))->setPaper('a4');
        foreach ($options as $k => $v) $pdf->setOption($k, $v);
        $pdf->render();
        $labels['totalPages'] = $pdf->getDomPDF()->getCanvas()->get_page_count();

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.sales-customer-invoices-pdf', compact('entries', 'labels', 'fmtN', 'g', 'paymentMethodsBreakdown'))->setPaper('a4');
        foreach ($options as $k => $v) $pdf->setOption($k, $v);

        return $pdf->stream('sales-customer-invoices-' . now()->format('Y-m-d') . '.pdf');
    }

    // ─── Purchases ───────────────────────────────────────────────────────────────────────


    public function exportPurchasesPdf(ReportRepositoryInterface $repo, ?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $paymentMethodId = null, ?int $categoryId = null, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $arabic = new \ArPHP\I18N\Arabic();
        $g = fn(string $text) => $arabic->utf8Glyphs($text);
        $data    = $repo->purchases($dateFrom, $dateTo, $userId, $supplierId, $paymentMethodId, $categoryId, false, $filterProductIds, $searchName);
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $includedProducts = $repo->getIncludedProducts($filterProductIds, $searchName);
        $productNames = collect($includedProducts)->pluck('name')->toArray();

        $labels = [
            'title'          => $g('تقرير المشتريات'),
            'generated_at'   => now()->format('Y-m-d H:i'),
            'filter_info'    => $g('معلومات التقرير'),
            'summary_label'  => $g('ملخص'),
            'products_val'   => !empty($productNames) ? array_map($g, $productNames) : [],
            'label_date_from'=> $g('من تاريخ'),
            'date_from_val'  => $dateFrom ?: '—',
            'date_to_label'  => $g('إلى تاريخ'),
            'date_to_val'    => $dateTo ?? now()->format('Y-m-d'),
            'total_purchases'=> $fmtN($data['totalPurchases']),
            'purchases_count'=> $data['purchasesCount'],
            'invoices_count' => $data['purchasesCount'],
            'avg_purchase'   => $fmtN($data['avgPurchase']),
            'avg_invoice'    => $fmtN($data['avgPurchase']),
            'total_paid'     => $fmtN($data['totalPaid']),
            'total_due'      => $fmtN($data['totalDue']),
            'col_month'      => $g('الشهر'),
            'col_count'      => $g('عدد الفواتير'),
            'col_total'      => $g('إجمالي المشتريات'),
            'lbl_total'      => $g('إجمالي المشتريات'),
            'lbl_count'      => $g('عدد الفواتير'),
            'lbl_avg'        => $g('متوسط الفاتورة'),
            'lbl_paid'       => $g('إجمالي المدفوع'),
            'lbl_due'        => $g('إجمالي المتبقي'),
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.purchases-pdf', [
            'labels' => $labels, 'data' => $data, 'g' => $g, 'fmtN' => $fmtN,
        ])->setPaper('a4')
          ->setOption('isHtml5ParserEnabled', true)
          ->setOption('isFontSubsettingEnabled', true);

        return $pdf->stream('purchases-' . now()->format('Y-m-d') . '.pdf');
    }


    public function exportPurchasesSupplierInvoicesPdf(ReportRepositoryInterface $repo, ?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null, ?int $limit = 500, ?int $offset = 0): \Illuminate\Http\Response
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $arabic = new \ArPHP\I18N\Arabic();
        $g  = fn($text) => $arabic->utf8Glyphs($text);
        $en = fn($str)  => str_replace(['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'], ['0','1','2','3','4','5','6','7','8','9'], $str);
        
        $data    = $repo->purchasesSupplierInvoices($dateFrom, $dateTo, $userId, $supplierId, $categoryId, $filterProductIds, $searchName, $limit ?? 500, $offset ?? 0);

        $includedProducts = $repo->getIncludedProducts($filterProductIds, $searchName);
        $productNames = collect($includedProducts)->pluck('name')->toArray();
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $entries = array_map(function ($entry) use ($g, $en) {
            return [
                'name'           => $en($g($entry['supplier_name'])),
                'purchase_count' => $entry['purchase_count'],
                'total_amount'   => $entry['total_amount'],
                'purchases'      => array_map(fn($p) => [
                    'id'    => $p['id'],
                    'date'  => substr($p['date'], 0, 10),
                    'total' => $p['total'],
                    'items' => array_map(fn($i) => [
                        'product_name' => $en($g(is_array($i) ? $i['product_name'] : $i->product_name)),
                        'quantity'     => is_array($i) ? $i['quantity'] : $i->quantity,
                        'unit_cost'    => is_array($i) ? $i['unit_cost'] : $i->unit_cost,
                        'count'        => is_array($i) ? ($i['count'] ?? 1) : ($i->count ?? 1),
                        'is_matched'   => is_array($i) ? ($i['is_matched'] ?? false) : ($i->is_matched ?? false),
                    ], $p['items']),
                ], $entry['purchases']),
            ];
        }, $data);

        $grandAmount = array_sum(array_column($data, 'total_amount'));
        $grandCount  = array_sum(array_column($data, 'purchase_count'));

        $matchedTotal = 0;
        foreach ($data as $entry) {
            foreach ($entry['purchases'] as $inv) {
                foreach ($inv['items'] as $item) {
                    $itemArray = (array) $item;
                    if (!empty($itemArray['is_matched'])) {
                        $matchedTotal += (float) ($itemArray['quantity'] * $itemArray['count'] * $itemArray['unit_cost']);
                    }
                }
            }
        }

        $labels = [
            'title'           => $g('فواتير الموردين التفصيلية'),
            'dateFrom'        => $dateFrom ?? $g('البداية'),
            'dateTo'          => $dateTo ?? now()->format('Y-m-d'),
            'products_val'    => !empty($productNames) ? array_map($g, $productNames) : [],
            'labelFrom'       => $g('من'),
            'labelTo'         => $g('إلى'),
            'generatedAt'     => now()->format('Y-m-d H:i'),
            'generatedLabel'  => $g('تاريخ الإنشاء'),
            'filterUser'      => $userId     ? $en($g(DB::table('users')->where('id', $userId)->value('name') ?? ''))             : null,
            'filterSupplier'  => $supplierId ? $en($g(DB::table('suppliers')->where('id', $supplierId)->value('name') ?? ''))     : null,
            'filterCategory'  => $categoryId ? $en($g(DB::table('categories')->where('id', $categoryId)->value('name') ?? ''))   : null,
            'labelUser'       => $g('المستخدم'),
            'labelSupplier'   => $g('المورد'),
            'labelCategory'   => $g('التصنيف'),
            'grandAmount'     => $grandAmount,
            'grandCount'      => $grandCount,
            'product'         => $g('المنتج'),
            'qty'             => $g('الحجم'),
            'count_label'     => $g('العدد'),
            'cost'            => $g('التكلفة'),
            'amount'          => $g('المبلغ'),
            'total'           => $g('الإجمالي'),
            'purchases_label' => $g('عدد الفواتير'),
            'suppliers_label' => $g('عدد الموردين'),
            'totalPages'      => 1,
        ];

        $options = ['isRemoteEnabled' => false, 'isHtml5ParserEnabled' => true, 'isFontSubsettingEnabled' => true, 'compress' => 1, 'dpi' => 96];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.purchases-supplier-invoices-pdf', compact('entries', 'labels', 'fmtN', 'g'))->setPaper('a4');
        foreach ($options as $k => $v) $pdf->setOption($k, $v);
        $pdf->render();
        $labels['totalPages'] = $pdf->getDomPDF()->getCanvas()->get_page_count();

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.purchases-supplier-invoices-pdf', compact('entries', 'labels', 'fmtN', 'g'))->setPaper('a4');
        foreach ($options as $k => $v) $pdf->setOption($k, $v);

        return $pdf->stream('purchases-supplier-invoices-' . now()->format('Y-m-d') . '.pdf');
    }

    // ─── Returns ───────────────────────────────────────────────────────────────────────


    public function exportReturnsPdf(ReportRepositoryInterface $repo, ?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $arabic = new \ArPHP\I18N\Arabic();
        $g    = fn(string $text) => $arabic->utf8Glyphs($text);
        $data    = $repo->returns($dateFrom, $dateTo, $userId, $customerId, $supplierId, $categoryId, $filterProductIds, $searchName);
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $includedProducts = $repo->getIncludedProducts($filterProductIds, $searchName);
        $productNames = collect($includedProducts)->pluck('name')->toArray();

        $labels = [
            'title'                => $g('تقرير المرتجعات'),
            'generated_at'         => now()->format('Y-m-d H:i'),
            'products_val'         => !empty($productNames) ? array_map($g, $productNames) : [],
            'label_date_from'      => $g('من تاريخ'),
            'date_from_val'        => $dateFrom ?: '—',
            'date_to_label'        => $g('إلى تاريخ'),
            'date_to_val'          => $dateTo ?? now()->format('Y-m-d'),
            'cr_total'             => $fmtN($data['customerReturnsTotal']),
            'cr_count'             => $data['customerReturnsCount'],
            'pr_total'             => $fmtN($data['supplierReturnsTotal']),
            'pr_count'             => $data['supplierReturnsCount'],
            'sales_total'          => $fmtN($data['totalSales']),
            'return_rate'          => $data['returnRate'] !== null ? $data['returnRate'] . '%' : '—',
            'lbl_cr'               => $g('مرتجعات العملاء'),
            'lbl_pr'               => $g('مرتجعات الموردين'),
            'lbl_sales'            => $g('إجمالي المبيعات'),
            'lbl_rate'             => $g('نسبة المرتجعات'),
            'col_month'            => $g('الشهر'),
            'col_count'            => $g('عدد'),
            'col_total'            => $g('الإجمالي'),
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.returns-pdf', [
            'labels' => $labels, 'data' => $data, 'g' => $g, 'fmtN' => $fmtN,
        ])->setPaper('a4')
          ->setOption('isHtml5ParserEnabled', true)
          ->setOption('isFontSubsettingEnabled', true);

        return $pdf->stream('returns-' . now()->format('Y-m-d') . '.pdf');
    }


    public function exportReturnsDetailsPdf(ReportRepositoryInterface $repo, ?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, string $type, ?string $searchName = null): \Illuminate\Http\Response
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $arabic = new \ArPHP\I18N\Arabic();
        $g  = fn($text) => $arabic->utf8Glyphs($text);
        $en = fn($str)  => str_replace(['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'], ['0','1','2','3','4','5','6','7','8','9'], $str);
        $data    = $repo->returnsDetails($dateFrom, $dateTo, $userId, $customerId, $supplierId, $categoryId, $type, $searchName);
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $entries = array_map(function ($entry) use ($g, $en) {
            return [
                'name'         => $en($g($entry['entity_name'])),
                'entity_type'  => $entry['entity_type'],
                'return_count' => $entry['return_count'],
                'total_amount' => $entry['total_amount'],
                'returns'      => array_map(fn($r) => [
                    'id'    => $r['id'],
                    'date'  => substr($r['date'], 0, 10),
                    'total' => $r['total'],
                    'items' => array_map(fn($i) => [
                        'product_name' => $en($g(is_array($i) ? $i['product_name'] : $i->product_name)),
                        'quantity'     => is_array($i) ? $i['quantity'] : $i->quantity,
                        'unit_price'   => is_array($i) ? $i['unit_price'] : $i->unit_price,
                        'size_label'   => is_array($i) ? ($i['size_label'] ?? null) : ($i->size_label ?? null),
                        'count'        => is_array($i) ? ($i['count'] ?? 1) : ($i->count ?? 1),
                        'line_total'   => is_array($i) ? ($i['line_total'] ?? 0) : ($i->line_total ?? 0),
                    ], $r['items']),
                ], $entry['returns']),
            ];
        }, $data);

        $grandAmount = array_sum(array_column($data, 'total_amount'));
        $grandCount  = array_sum(array_column($data, 'return_count'));
        $typeLabel   = match($type) { 'customer' => $g('مرتجعات العملاء'), 'supplier' => $g('مرتجعات الموردين'), default => $g('جميع المرتجعات') };

        $labels = [
            'title'          => $g('تفاصيل المرتجعات'),
            'type_label'     => $typeLabel,
            'dateFrom'       => $dateFrom ?: '—',
            'dateTo'         => $dateTo ?? now()->format('Y-m-d'),
            'labelFrom'      => $g('من'),
            'labelTo'        => $g('إلى'),
            'generatedAt'    => now()->format('Y-m-d H:i'),
            'generatedLabel' => $g('تاريخ الإنشاء'),
            'filterUser'     => $userId     ? $en($g(DB::table('users')->where('id', $userId)->value('name') ?? ''))         : null,
            'filterCustomer' => $customerId ? $en($g(DB::table('customers')->where('id', $customerId)->value('name') ?? '')) : null,
            'filterSupplier' => $supplierId ? $en($g(DB::table('suppliers')->where('id', $supplierId)->value('name') ?? '')) : null,
            'filterCategory' => $categoryId ? $en($g(DB::table('categories')->where('id', $categoryId)->value('name') ?? '')) : null,
            'labelUser'      => $g('المستخدم'),
            'labelCustomer'  => $g('العميل'),
            'labelSupplier'  => $g('المورد'),
            'labelCategory'  => $g('التصنيف'),
            'labelType'      => $g('النوع'),
            'grandAmount'    => $grandAmount,
            'grandCount'     => $grandCount,
            'product'        => $g('المنتج'),
            'qty'            => $g('الحجم'),
            'count_label'    => $g('العدد'),
            'price'          => $g('السعر'),
            'amount'         => $g('المبلغ'),
            'total'          => $g('الإجمالي'),
            'returns_label'  => $g('عدد المرتجعات'),
            'entities_label' => $g('عدد الجهات'),
            'totalPages'     => 1,
        ];

        $options = ['isRemoteEnabled' => false, 'isHtml5ParserEnabled' => true, 'isFontSubsettingEnabled' => true, 'compress' => 1, 'dpi' => 96];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.returns-details-pdf', compact('entries', 'labels', 'fmtN'))->setPaper('a4');
        foreach ($options as $k => $v) $pdf->setOption($k, $v);
        $pdf->render();
        $labels['totalPages'] = $pdf->getDomPDF()->getCanvas()->get_page_count();

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.returns-details-pdf', compact('entries', 'labels', 'fmtN'))->setPaper('a4');
        foreach ($options as $k => $v) $pdf->setOption($k, $v);

        return $pdf->stream('returns-details-' . now()->format('Y-m-d') . '.pdf');
    }

    // ─── Profit Analysis ────────────────────────────────────────────────────────


    public function exportProfitAnalysisPdf(ReportRepositoryInterface $repo, ?string $dateFrom, ?string $dateTo, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $arabic = new \ArPHP\I18N\Arabic();
        $g = fn(string $text) => $arabic->utf8Glyphs($text);

        $data = $repo->dailyProfitSummary($dateFrom, $dateTo, $filterProductIds, null, $searchName);
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $n !== null ? ($isWhole($n) ? number_format($n, 0) : number_format($n, 2)) : '—';

        $productNames = collect($data['included_products'])->pluck('name')->toArray();

        $labels = [
            'title'        => $g('تحليل الأرباح الشامل'),
            'generated_at' => now()->format('Y-m-d H:i'),
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.profit-analysis-pdf', [
            'labels'       => $labels,
            'data'         => $data,
            'g'            => $g,
            'fmtN'         => $fmtN,
            'dateFrom'     => $dateFrom,
            'dateTo'       => $dateTo,
            'productNames' => $productNames,
        ])
        ->setPaper('a4', 'portrait')
        ->setOption('isHtml5ParserEnabled', true)
        ->setOption('isFontSubsettingEnabled', true);

        return $pdf->stream('profit-analysis-' . now()->format('Y-m-d') . '.pdf');
    }
}
