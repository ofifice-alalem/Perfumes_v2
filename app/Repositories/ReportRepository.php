<?php

namespace App\Repositories;

use App\Repositories\Contracts\ReportRepositoryInterface;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ReportRepository implements ReportRepositoryInterface
{
    public function productMovement(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type): array
    {
        $dateFrom = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dateTo   = $dateTo   ? $dateTo   . ' 23:59:59' : null;

        // ── حساب رصيد أول الفترة ──────────────────────────────────────────
        $currentStock = DB::table('products')->where('id', $productId)->value('stock') ?? 0;

        // كل الحركات من date_from حتى الآن (لطرحها من الرصيد الحالي)
        if ($dateFrom) {
            $purchasesAfter = DB::table('purchase_items')
                ->join('purchases', 'purchases.id', '=', 'purchase_items.purchase_id')
                ->whereNull('purchases.deleted_at')
                ->where('purchase_items.product_id', $productId)
                ->where('purchases.created_at', '>=', $dateFrom)
                ->sum('purchase_items.quantity');

            $salesAfter = DB::table('invoice_items')
                ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
                ->whereNull('invoices.deleted_at')
                ->where('invoice_items.product_id', $productId)
                ->where('invoices.created_at', '>=', $dateFrom)
                ->sum('invoice_items.quantity');

            $returnInAfter = DB::table('invoice_return_items')
                ->join('invoice_returns', 'invoice_returns.id', '=', 'invoice_return_items.invoice_return_id')
                ->whereNull('invoice_returns.deleted_at')
                ->where('invoice_return_items.product_id', $productId)
                ->where('invoice_returns.created_at', '>=', $dateFrom)
                ->sum('invoice_return_items.quantity');

            $returnOutAfter = DB::table('purchase_return_items')
                ->join('purchase_returns', 'purchase_returns.id', '=', 'purchase_return_items.purchase_return_id')
                ->whereNull('purchase_returns.deleted_at')
                ->where('purchase_return_items.product_id', $productId)
                ->where('purchase_returns.created_at', '>=', $dateFrom)
                ->sum('purchase_return_items.quantity');

            $wasteAfter = DB::table('waste_items')
                ->join('waste_logs', 'waste_logs.id', '=', 'waste_items.waste_log_id')
                ->where('waste_items.product_id', $productId)
                ->where('waste_logs.created_at', '>=', $dateFrom)
                ->sum('waste_items.quantity');

            $openingStock = $currentStock
                - $purchasesAfter
                + $salesAfter
                - $returnInAfter
                + $returnOutAfter
                + $wasteAfter;
        } else {
            $openingStock = 0;
        }

        // ── جمع الحركات ───────────────────────────────────────────────────
        $movements = collect();

        // 1. مشتريات
        if (!$type || $type === 'purchase') {
            $rows = DB::table('purchase_items')
                ->join('purchases', 'purchases.id', '=', 'purchase_items.purchase_id')
                ->whereNull('purchases.deleted_at')
                ->where('purchase_items.product_id', $productId)
                ->when($dateFrom, fn($q) => $q->where('purchases.created_at', '>=', $dateFrom))
                ->when($dateTo,   fn($q) => $q->where('purchases.created_at', '<=', $dateTo))
                ->select(
                    'purchases.created_at as date',
                    DB::raw("'purchase' as type"),
                    'purchase_items.quantity',
                    'purchase_items.unit_cost as unit_price',
                    DB::raw("CONCAT('PO#', purchases.id) as reference")
                )
                ->get();
            $movements = $movements->merge($rows);
        }

        // 2. مبيعات
        if (!$type || $type === 'sale') {
            $rows = DB::table('invoice_items')
                ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
                ->whereNull('invoices.deleted_at')
                ->where('invoice_items.product_id', $productId)
                ->when($dateFrom, fn($q) => $q->where('invoices.created_at', '>=', $dateFrom))
                ->when($dateTo,   fn($q) => $q->where('invoices.created_at', '<=', $dateTo))
                ->select(
                    'invoices.created_at as date',
                    DB::raw("'sale' as type"),
                    DB::raw('-invoice_items.quantity as quantity'),
                    'invoice_items.unit_price',
                    DB::raw("CONCAT('INV#', invoices.id) as reference")
                )
                ->get();
            $movements = $movements->merge($rows);
        }

        // 3. مرتجعات عملاء (دخول)
        if (!$type || $type === 'return_in') {
            $rows = DB::table('invoice_return_items')
                ->join('invoice_returns', 'invoice_returns.id', '=', 'invoice_return_items.invoice_return_id')
                ->whereNull('invoice_returns.deleted_at')
                ->where('invoice_return_items.product_id', $productId)
                ->when($dateFrom, fn($q) => $q->where('invoice_returns.created_at', '>=', $dateFrom))
                ->when($dateTo,   fn($q) => $q->where('invoice_returns.created_at', '<=', $dateTo))
                ->select(
                    'invoice_returns.created_at as date',
                    DB::raw("'return_in' as type"),
                    'invoice_return_items.quantity',
                    'invoice_return_items.unit_price',
                    DB::raw("CONCAT('RET#', invoice_returns.id) as reference")
                )
                ->get();
            $movements = $movements->merge($rows);
        }

        // 4. مرتجعات موردين (خروج)
        if (!$type || $type === 'return_out') {
            $rows = DB::table('purchase_return_items')
                ->join('purchase_returns', 'purchase_returns.id', '=', 'purchase_return_items.purchase_return_id')
                ->whereNull('purchase_returns.deleted_at')
                ->where('purchase_return_items.product_id', $productId)
                ->when($dateFrom, fn($q) => $q->where('purchase_returns.created_at', '>=', $dateFrom))
                ->when($dateTo,   fn($q) => $q->where('purchase_returns.created_at', '<=', $dateTo))
                ->select(
                    'purchase_returns.created_at as date',
                    DB::raw("'return_out' as type"),
                    DB::raw('-purchase_return_items.quantity as quantity'),
                    'purchase_return_items.unit_cost as unit_price',
                    DB::raw("CONCAT('PRET#', purchase_returns.id) as reference")
                )
                ->get();
            $movements = $movements->merge($rows);
        }

        // 5. تالف (خروج)
        if (!$type || $type === 'waste') {
            $rows = DB::table('waste_items')
                ->join('waste_logs', 'waste_logs.id', '=', 'waste_items.waste_log_id')
                ->where('waste_items.product_id', $productId)
                ->when($dateFrom, fn($q) => $q->where('waste_logs.created_at', '>=', $dateFrom))
                ->when($dateTo,   fn($q) => $q->where('waste_logs.created_at', '<=', $dateTo))
                ->select(
                    'waste_logs.created_at as date',
                    DB::raw("'waste' as type"),
                    DB::raw('-waste_items.quantity as quantity'),
                    DB::raw('NULL as unit_price'),
                    DB::raw("CONCAT('WST#', waste_logs.id) as reference")
                )
                ->get();
            $movements = $movements->merge($rows);
        }

        // ── ترتيب زمني + حساب الرصيد التراكمي ───────────────────────────
        $sorted  = $movements->sortBy('date')->values();
        $balance = (float) $openingStock;

        $result = $sorted->map(function ($row) use (&$balance) {
            $balance += (float) $row->quantity;
            return [
                'date'       => $row->date,
                'type'       => $row->type,
                'quantity'   => (float) $row->quantity,
                'unit_price' => $row->unit_price !== null ? (float) $row->unit_price : null,
                'reference'  => $row->reference,
                'balance'    => round($balance, 2),
            ];
        });

        return [
            'opening_stock' => round((float) $openingStock, 2),
            'movements'     => $result->values(),
            'closing_stock' => round($balance, 2),
        ];
    }

    // ─── Excel ───────────────────────────────────────────────────────────────

    public function exportProductMovementExcel(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type): void
    {
        $product = DB::table('products')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->where('products.id', $productId)
            ->select('products.name', 'categories.unit')
            ->first();

        $data = $this->productMovement($productId, $dateFrom, $dateTo, $type);

        $typeLabels = [
            'purchase'   => 'شراء',
            'sale'       => 'بيع',
            'return_in'  => 'مرتجع عميل',
            'return_out' => 'مرتجع مورد',
            'waste'      => 'تالف',
        ];

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setRightToLeft(true);
        $sheet->setTitle('حركة المنتج');

        $row = 1;

        // معلومات التقرير
        $infoRows = [
            ['تقرير حركة المنتج', ''],
            ['المنتج',    $product->name ?? ''],
            ['من تاريخ', $dateFrom ?? 'الكل'],
            ['إلى تاريخ', $dateTo  ?? 'الكل'],
            ['رصيد أول الفترة', $data['opening_stock'] . ' ' . ($product->unit ?? '')],
            ['رصيد آخر الفترة', $data['closing_stock'] . ' ' . ($product->unit ?? '')],
        ];

        foreach ($infoRows as $info) {
            $sheet->setCellValue('A' . $row, $info[0]);
            $sheet->setCellValue('B' . $row, $info[1]);
            $sheet->getStyle('A' . $row . ':B' . $row)->applyFromArray([
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'EFF6FF']],
                'font'    => ['bold' => true, 'size' => 11],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
            $row++;
        }
        $row++;

        // رأس الجدول
        $headers = ['#', 'التاريخ', 'النوع', 'الكمية', 'السعر', 'المرجع', 'الرصيد'];
        $sheet->fromArray($headers, null, 'A' . $row);
        $sheet->getStyle('A' . $row . ':G' . $row)->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A5F']],
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $row++;

        // البيانات
        foreach ($data['movements'] as $i => $m) {
            $isIn = $m['quantity'] > 0;
            $qty  = ($isIn ? '+' : '') . $m['quantity'];
            $bg   = $i % 2 === 0 ? 'FFFFFF' : 'F8FAFC';

            $sheet->fromArray([
                $i + 1,
                \Carbon\Carbon::parse($m['date'])->format('Y-m-d'),
                $typeLabels[$m['type']] ?? $m['type'],
                $qty,
                $m['unit_price'] ?? '—',
                $m['reference'],
                $m['balance'],
            ], null, 'A' . $row);

            $sheet->getStyle('A' . $row . ':G' . $row)->applyFromArray([
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);

            // لون الكمية
            $sheet->getStyle('D' . $row)->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => $isIn ? '16A34A' : 'DC2626']],
            ]);

            $row++;
        }

        // صف الإجمالي
        $sheet->setCellValue('A' . $row, 'رصيد آخر الفترة');
        $sheet->setCellValue('G' . $row, $data['closing_stock'] . ' ' . ($product->unit ?? ''));
        $sheet->mergeCells('A' . $row . ':F' . $row);
        $sheet->getStyle('A' . $row . ':G' . $row)->applyFromArray([
            'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DBEAFE']],
            'font'    => ['bold' => true, 'size' => 11],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);

        foreach (range('A', 'G') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filename = 'product-movement-' . ($product->name ?? $productId) . '-' . now()->format('Y-m-d') . '.xlsx';

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        (new Xlsx($spreadsheet))->save('php://output');
        exit;
    }

    // ─── PDF ─────────────────────────────────────────────────────────────────

    public function exportProductMovementPdf(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type): \Illuminate\Http\Response
    {
        $arabic = new \ArPHP\I18N\Arabic();
        $g = fn(string $text) => $arabic->utf8Glyphs($text);

        $product = DB::table('products')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->where('products.id', $productId)
            ->select('products.name', 'categories.unit')
            ->first();

        $data = $this->productMovement($productId, $dateFrom, $dateTo, $type);

        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $typeLabels = [
            'purchase'   => 'شراء',
            'sale'       => 'بيع',
            'return_in'  => 'مرتجع عميل',
            'return_out' => 'مرتجع مورد',
            'waste'      => 'تالف',
        ];

        $labels = [
            'title'               => $g('تقرير حركة المنتج'),
            'product_name'        => $g($product->name ?? ''),
            'unit'                => $product->unit ?? '',
            'date_from'           => $dateFrom,
            'date_to'             => $dateTo,
            'all_dates'           => $g('جميع التواريخ'),
            'opening_stock'       => $g('رصيد أول الفترة'),
            'closing_stock'       => $g('رصيد آخر الفترة'),
            'movements_count'     => $g('عدد الحركات'),
            'opening_val'         => $fmtN($data['opening_stock']),
            'closing_val'         => $fmtN($data['closing_stock']),
            'movements_val'       => count($data['movements']),
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
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.product-movement-pdf', [
            'labels'     => $labels,
            'movements'  => $data['movements'],
            'typeLabels' => $typeLabels,
            'g'          => $g,
        ])
        ->setPaper('a4')
        ->setOption('isHtml5ParserEnabled', true)
        ->setOption('isFontSubsettingEnabled', true);

        return $pdf->stream('product-movement-' . now()->format('Y-m-d') . '.pdf');
    }

    // ─── Stock Status ──────────────────────────────────────────────────────────

    public function stockStatus(?int $categoryId, ?string $sellingType, bool $lowStockOnly, bool $showSold = false, bool $showWasted = false): array
    {
        $query = DB::table('products')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->leftJoin('price_tiers', 'price_tiers.id', '=', 'products.price_tier_id')
            ->when($categoryId,   fn($q) => $q->where('products.category_id', $categoryId))
            ->when($sellingType,  fn($q) => $q->where('products.selling_type', $sellingType))
            ->when($lowStockOnly, fn($q) => $q->whereRaw('products.stock <= products.min_stock'))
            ->select(
                'products.id',
                'products.name',
                'products.stock',
                'products.min_stock',
                'products.selling_type',
                'categories.name as category_name',
                'categories.unit',
                'price_tiers.name as tier_name',
            )
            ->orderBy('products.name')
            ->get();

        return $query->map(function ($p) use ($showSold, $showWasted) {
            $lastPurchaseCost = DB::table('purchase_items')
                ->join('purchases', 'purchases.id', '=', 'purchase_items.purchase_id')
                ->whereNull('purchases.deleted_at')
                ->where('purchase_items.product_id', $p->id)
                ->orderByDesc('purchases.created_at')
                ->value('purchase_items.unit_cost');

            $avgPurchaseCost = DB::table('purchase_items')
                ->join('purchases', 'purchases.id', '=', 'purchase_items.purchase_id')
                ->whereNull('purchases.deleted_at')
                ->where('purchase_items.product_id', $p->id)
                ->avg('purchase_items.unit_cost');

            $lastSalePrice = DB::table('invoice_items')
                ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
                ->whereNull('invoices.deleted_at')
                ->where('invoice_items.product_id', $p->id)
                ->orderByDesc('invoices.created_at')
                ->value('invoice_items.unit_price');

            $avgSalePrice = DB::table('invoice_items')
                ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
                ->whereNull('invoices.deleted_at')
                ->where('invoice_items.product_id', $p->id)
                ->avg('invoice_items.unit_price');

            $status = match(true) {
                (float)$p->stock <= 0                     => 'critical',
                (float)$p->stock <= (float)$p->min_stock  => 'warning',
                default                                   => 'ok',
            };

            $totalSold = $showSold ? (float) DB::table('invoice_items')
                ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
                ->whereNull('invoices.deleted_at')
                ->where('invoice_items.product_id', $p->id)
                ->sum('invoice_items.quantity') : null;

            $totalWasted = $showWasted ? (float) DB::table('waste_items')
                ->join('waste_logs', 'waste_logs.id', '=', 'waste_items.waste_log_id')
                ->where('waste_items.product_id', $p->id)
                ->sum('waste_items.quantity') : null;

            return [
                'id'                 => $p->id,
                'name'               => $p->name,
                'category'           => $p->category_name,
                'unit'               => $p->unit,
                'selling_type'       => $p->selling_type,
                'tier'               => $p->tier_name,
                'stock'              => (float)$p->stock,
                'min_stock'          => (float)$p->min_stock,
                'status'             => $status,
                'last_purchase_cost' => $lastPurchaseCost ? (float)$lastPurchaseCost : null,
                'avg_purchase_cost'  => $avgPurchaseCost  ? round((float)$avgPurchaseCost, 2) : null,
                'last_sale_price'    => $lastSalePrice    ? (float)$lastSalePrice    : null,
                'avg_sale_price'     => $avgSalePrice     ? round((float)$avgSalePrice, 2)    : null,
                'total_sold'         => $totalSold,
                'total_wasted'       => $totalWasted,
            ];
        })->values()->toArray();
    }

    public function exportStockStatusExcel(?int $categoryId, ?string $sellingType, bool $lowStockOnly, bool $showSold = false, bool $showWasted = false): void
    {
        $data = $this->stockStatus($categoryId, $sellingType, $lowStockOnly, $showSold, $showWasted);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setRightToLeft(true);
        $sheet->setTitle('المخزون الحالي');

        $row = 1;
        $headers = ['#', 'المنتج', 'التصنيف', 'المخزون', 'الحد الأدنى', 'الحالة', 'آخر شراء', 'متوسط شراء', 'آخر بيع', 'متوسط بيع'];
        if ($showSold)   $headers[] = 'إجمالي المبيع';
        if ($showWasted) $headers[] = 'إجمالي التالف';

        $lastCol = chr(ord('A') + count($headers) - 1);
        $sheet->fromArray($headers, null, 'A' . $row);
        $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A5F']],
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $row++;

        $statusLabels = ['ok' => 'جيد', 'warning' => 'تحذير', 'critical' => 'حرج'];
        $statusColors = ['ok' => '16A34A', 'warning' => 'D97706', 'critical' => 'DC2626'];
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $n !== null ? ($isWhole($n) ? number_format($n, 0) : number_format($n, 2)) : '—';

        foreach ($data as $i => $p) {
            $bg = $i % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
            $rowData = [
                $i + 1,
                $p['name'],
                $p['category'],
                $fmtN($p['stock']) . ' ' . $p['unit'],
                $fmtN($p['min_stock']) . ' ' . $p['unit'],
                $statusLabels[$p['status']],
                $fmtN($p['last_purchase_cost']),
                $fmtN($p['avg_purchase_cost']),
                $fmtN($p['last_sale_price']),
                $fmtN($p['avg_sale_price']),
            ];
            if ($showSold)   $rowData[] = $fmtN($p['total_sold'])   . ' ' . $p['unit'];
            if ($showWasted) $rowData[] = $fmtN($p['total_wasted']) . ' ' . $p['unit'];

            $sheet->fromArray($rowData, null, 'A' . $row);
            $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
            $sheet->getStyle('F' . $row)->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => $statusColors[$p['status']]]],
            ]);
            $row++;
        }

        foreach (range('A', $lastCol) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filename = 'stock-status-' . now()->format('Y-m-d') . '.xlsx';
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');
        (new Xlsx($spreadsheet))->save('php://output');
        exit;
    }

    public function exportStockStatusPdf(?int $categoryId, ?string $sellingType, bool $lowStockOnly, bool $showSold = false, bool $showWasted = false): \Illuminate\Http\Response
    {
        $arabic = new \ArPHP\I18N\Arabic();
        $g = fn(string $text) => $arabic->utf8Glyphs($text);

        $data    = $this->stockStatus($categoryId, $sellingType, $lowStockOnly, $showSold, $showWasted);
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $n !== null ? ($isWhole($n) ? number_format($n, 0) : number_format($n, 2)) : '—';

        $statusLabels = ['ok' => 'جيد', 'warning' => 'تحذير', 'critical' => 'حرج'];

        $labels = [
            'title'          => $g('تقرير المخزون الحالي'),
            'generated_at'   => now()->format('Y-m-d H:i'),
            'filter_info'    => $g('معلومات التقرير'),
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
            'show_sold'      => $showSold,
            'show_wasted'    => $showWasted,
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.stock-status-pdf', [
            'labels'       => $labels,
            'data'         => $data,
            'statusLabels' => $statusLabels,
            'g'            => $g,
            'fmtN'         => $fmtN,
        ])
        ->setPaper('a4')
        ->setOption('isHtml5ParserEnabled', true)
        ->setOption('isFontSubsettingEnabled', true);

        return $pdf->stream('stock-status-' . now()->format('Y-m-d') . '.pdf');
    }

    // ─── Customer Aging ────────────────────────────────────────────────────────

    public function customerAging(?int $customerId, ?string $dateTo): array
    {
        $dateTo = $dateTo ? $dateTo . ' 23:59:59' : now()->toDateTimeString();
        $dateToCarbon = \Carbon\Carbon::parse($dateTo);

        // جلب العملاء المعنيين
        $customersQuery = DB::table('customers')
            ->when($customerId, fn($q) => $q->where('id', $customerId))
            ->where('id', '!=', 1) // استثناء الزبون النقدي
            ->orderBy('name')
            ->get(['id', 'name']);

        return $customersQuery->map(function ($customer) use ($dateTo, $dateToCarbon) {

            // إجمالي الفواتير حتى تاريخ المرجع
            $totalInvoiced = (float) DB::table('invoices')
                ->whereNull('deleted_at')
                ->where('customer_id', $customer->id)
                ->where('created_at', '<=', $dateTo)
                ->sum('total');

            // إجمالي الدفعات حتى تاريخ المرجع
            $totalPaid = (float) DB::table('payments')
                ->where('customer_id', $customer->id)
                ->where('created_at', '<=', $dateTo)
                ->sum('amount');

            // إجمالي التسويات حتى تاريخ المرجع
            $totalSettled = (float) DB::table('settlements')
                ->where('customer_id', $customer->id)
                ->where('created_at', '<=', $dateTo)
                ->sum('amount');

            // إجمالي المرتجعات حتى تاريخ المرجع
            $totalReturned = (float) DB::table('invoice_returns')
                ->whereNull('deleted_at')
                ->where('customer_id', $customer->id)
                ->where('created_at', '<=', $dateTo)
                ->sum('total');

            $totalDebt = $totalInvoiced - $totalPaid - $totalSettled - $totalReturned;

            if ($totalDebt <= 0) return null;

            // تفاصيل الفواتير غير المسددة لتصنيف العمر
            $invoices = DB::table('invoices')
                ->whereNull('deleted_at')
                ->where('customer_id', $customer->id)
                ->whereIn('payment_status', ['unpaid', 'partial'])
                ->where('created_at', '<=', $dateTo)
                ->select('id as invoice_id', 'total', 'paid_amount', 'created_at')
                ->orderBy('created_at')
                ->get();

            $current   = 0;
            $days30_60 = 0;
            $days60_90 = 0;
            $over90    = 0;
            $invoicesList = [];

            foreach ($invoices as $inv) {
                $due  = (float)$inv->total - (float)$inv->paid_amount;
                if ($due <= 0) continue;
                $days = (int) \Carbon\Carbon::parse($inv->created_at)->diffInDays($dateToCarbon);

                if      ($days < 30) $current   += $due;
                elseif  ($days < 60) $days30_60 += $due;
                elseif  ($days < 90) $days60_90 += $due;
                else                 $over90    += $due;

                $invoicesList[] = [
                    'invoice_id' => $inv->invoice_id,
                    'date'       => $inv->created_at,
                    'total'      => (float)$inv->total,
                    'paid'       => (float)$inv->paid_amount,
                    'due'        => round($due, 2),
                    'days_old'   => $days,
                ];
            }

            return [
                'customer_id'   => $customer->id,
                'customer_name' => $customer->name,
                'total_debt'    => round($totalDebt, 2),
                'total_invoiced'=> round($totalInvoiced, 2),
                'total_paid'    => round($totalPaid, 2),
                'total_settled' => round($totalSettled, 2),
                'total_returned'=> round($totalReturned, 2),
                'current'       => round($current, 2),
                'days_30_60'    => round($days30_60, 2),
                'days_60_90'    => round($days60_90, 2),
                'over_90'       => round($over90, 2),
                'invoices'      => $invoicesList,
            ];
        })->filter()->values()->toArray();
    }

    public function exportCustomerAgingExcel(?int $customerId, ?string $dateTo): void
    {
        $data = $this->customerAging($customerId, $dateTo);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setRightToLeft(true);
        $sheet->setTitle('ديون العملاء');

        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $row = 1;
        $headers = ['#', 'العميل', 'إجمالي الدين', 'أقل من 30 يوم', '30-60 يوم', '60-90 يوم', 'أكثر من 90 يوم'];
        $lastCol = chr(ord('A') + count($headers) - 1);
        $sheet->fromArray($headers, null, 'A' . $row);
        $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A5F']],
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $row++;

        foreach ($data as $i => $c) {
            $bg = $i % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
            $sheet->fromArray([
                $i + 1,
                $c['customer_name'],
                $fmtN($c['total_debt']),
                $fmtN($c['current']),
                $fmtN($c['days_30_60']),
                $fmtN($c['days_60_90']),
                $fmtN($c['over_90']),
            ], null, 'A' . $row);
            $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
            // لون الديون القديمة
            if ($c['over_90'] > 0) {
                $sheet->getStyle('G' . $row)->applyFromArray(['font' => ['bold' => true, 'color' => ['rgb' => 'DC2626']]]);
            }
            $row++;

            // تفاصيل الفواتير
            foreach ($c['invoices'] as $inv) {
                $sheet->fromArray([
                    '',
                    '  INV#' . $inv['invoice_id'],
                    $fmtN($inv['due']),
                    \Carbon\Carbon::parse($inv['date'])->format('Y-m-d'),
                    $inv['days_old'] . ' يوم',
                    '',
                    '',
                ], null, 'A' . $row);
                $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
                    'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F8FAFC']],
                    'font'    => ['color' => ['rgb' => '64748B'], 'size' => 9],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                ]);
                $row++;
            }
        }

        // صف الإجمالي
        $totalDebt   = array_sum(array_column($data, 'total_debt'));
        $totalOver90 = array_sum(array_column($data, 'over_90'));
        $sheet->fromArray(['', 'الإجمالي', $fmtN($totalDebt), '', '', '', $fmtN($totalOver90)], null, 'A' . $row);
        $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
            'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DBEAFE']],
            'font'    => ['bold' => true, 'size' => 11],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);

        foreach (range('A', $lastCol) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filename = 'customer-aging-' . now()->format('Y-m-d') . '.xlsx';
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');
        (new Xlsx($spreadsheet))->save('php://output');
        exit;
    }

    public function exportCustomerAgingPdf(?int $customerId, ?string $dateTo): \Illuminate\Http\Response
    {
        $arabic = new \ArPHP\I18N\Arabic();
        $g = fn(string $text) => $arabic->utf8Glyphs($text);

        $data    = $this->customerAging($customerId, $dateTo);
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $totalDebt   = array_sum(array_column($data, 'total_debt'));
        $totalOver90 = array_sum(array_column($data, 'over_90'));

        $labels = [
            'title'          => $g('تقرير ديون العملاء'),
            'generated_at'   => now()->format('Y-m-d H:i'),
            'filter_info'    => $g('معلومات التقرير'),
            'summary_label'  => $g('ملخص'),
            'date_to_label'  => $g('تاريخ المرجع'),
            'date_to_val'    => $dateTo ?? now()->format('Y-m-d'),
            'customers_count'=> count($data),
            'total_debt'     => $fmtN($totalDebt),
            'total_over90'   => $fmtN($totalOver90),
            'col_customer'   => $g('العميل'),
            'col_total'      => $g('إجمالي الدين'),
            'col_breakdown'  => $g('فواتير/دفعات/مرتجعات'),
            'col_current'    => $g('أقل 30 يوم'),
            'col_30_60'      => $g('30-60 يوم'),
            'col_60_90'      => $g('60-90 يوم'),
            'col_over90'     => $g('أكثر 90 يوم'),
            'col_invoices'   => $g('الفواتير'),
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
}
