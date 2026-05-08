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
            'title'           => $g('تقرير حركة المنتج'),
            'product_name'    => $g($product->name ?? ''),
            'unit'            => $product->unit ?? '',
            'date_from'       => $dateFrom,
            'date_to'         => $dateTo,
            'all_dates'       => $g('جميع التواريخ'),
            'opening_stock'   => $g('رصيد أول الفترة'),
            'closing_stock'   => $g('رصيد آخر الفترة'),
            'movements_count' => $g('عدد الحركات'),
            'opening_val'     => $fmtN($data['opening_stock']),
            'closing_val'     => $fmtN($data['closing_stock']),
            'movements_val'   => count($data['movements']),
            'col_date'        => $g('التاريخ'),
            'col_type'        => $g('النوع'),
            'col_qty'         => $g('الكمية'),
            'col_price'       => $g('السعر'),
            'col_ref'         => $g('المرجع'),
            'col_balance'     => $g('الرصيد'),
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
}
