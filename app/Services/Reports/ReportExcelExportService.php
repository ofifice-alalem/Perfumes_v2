<?php

namespace App\Services\Reports;

use App\Repositories\Contracts\ReportRepositoryInterface;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use OpenSpout\Writer\XLSX\Writer;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Cell;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Common\Entity\Style\Border as SpoutBorder;
use OpenSpout\Common\Entity\Style\BorderBuilder;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Writer\XLSX\Entity\SheetView;

class ReportExcelExportService
{
    private function tryCppExport(string $title, string $dateFrom, string $dateTo, string $productsStr, string $entityLabel, string $mode, array $lines, string $filename): bool
    {
        $cppExe = PHP_OS_FAMILY === 'Windows' ? base_path('bin' . DIRECTORY_SEPARATOR . 'export_xlsx.exe') : base_path('bin' . DIRECTORY_SEPARATOR . 'export_xlsx');
        if (!file_exists($cppExe)) return false;

        $storageDir = storage_path('app');
        if (!file_exists($storageDir)) { @mkdir($storageDir, 0777, true); }

        $tmpTsv  = $storageDir . DIRECTORY_SEPARATOR . 'cpp_db_' . uniqid() . '.tsv';
        $tmpXlsx = $storageDir . DIRECTORY_SEPARATOR . 'cpp_exp_' . uniqid() . '.xlsx';

        $f = fopen($tmpTsv, 'w');
        fwrite($f, "#META\t" . $dateFrom . "\t" . $dateTo . "\t" . $productsStr . "\t" . now()->format('Y-m-d H:i') . "\t" . $title . "\t" . $entityLabel . "\t" . $mode . "\n");

        foreach ($lines as $line) {
            fwrite($f, (is_array($line) ? implode("\t", $line) : $line) . "\n");
        }
        fclose($f);

        $cmdCpp = '"' . $cppExe . '" "' . $tmpXlsx . '" "' . $tmpTsv . '"';
        exec($cmdCpp, $out, $code);

        if ($code === 0 && file_exists($tmpXlsx) && filesize($tmpXlsx) > 0) {
            header('X-Export-Engine: C++ Static Binary Exporter');
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Content-Length: ' . filesize($tmpXlsx));
            readfile($tmpXlsx);
            @unlink($tmpTsv);
            @unlink($tmpXlsx);
            exit;
        }

        @unlink($tmpTsv);
        @unlink($tmpXlsx);
        return false;
    }


    public function exportProductMovementExcel(ReportRepositoryInterface $repo, int $productId, ?string $dateFrom, ?string $dateTo, ?string $type): void
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $product = DB::table('products')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->where('products.id', $productId)
            ->select('products.name', 'categories.unit')
            ->first();

        $data = $repo->productMovement($productId, $dateFrom, $dateTo, $type, null);

        $typeLabels = [
            'purchase'   => 'شراء',
            'sale'       => 'بيع',
            'return_in'  => 'مرتجع عميل',
            'return_out' => 'مرتجع مورد',
            'waste'      => 'تالف',
            'opening_balance' => 'رصيد افتتاحي',
        ];

        $filename = 'product-movement-' . now()->format('Y-m-d') . '.xlsx';
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new \OpenSpout\Writer\XLSX\Writer();
        $options = $writer->getOptions();
        $options->setColumnWidth(10, 1);
        $options->setColumnWidth(25, 2);
        $options->setColumnWidth(25, 3);
        $options->setColumnWidth(25, 4);
        $options->setColumnWidth(25, 5);
        $options->setColumnWidth(25, 6);

        $writer->openToFile('php://output');
        $writer->getCurrentSheet()->setSheetView((new \OpenSpout\Writer\XLSX\Entity\SheetView())->withRightToLeft(true));

        $titleStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $infoStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withBackgroundColor('E3F2FD');

        $tblHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $rowStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(12);

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تقرير حركة الصنف والمنتج'], $titleStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['المنتج', $product->name ?? ''], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['من تاريخ', $dateFrom ?? 'الكل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إلى تاريخ', $dateTo ?? 'الكل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['رصيد أول الفترة', $data['opening_stock'] . ' ' . ($product->unit ?? '')], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['رصيد آخر الفترة', $data['closing_stock'] . ' ' . ($product->unit ?? '')], $infoStyle));
        $writer->addRow(new \OpenSpout\Common\Entity\Row([]));

        $headers = ['#', 'التاريخ', 'النوع', 'الكمية', 'السعر (د.ل)', 'المرجع', 'الرصيد'];
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle($headers, $tblHeaderStyle));

        foreach ($data['movements'] as $i => $m) {
            $isIn = $m['quantity'] > 0;
            $qty  = ($isIn ? '+' : '') . $m['quantity'];

            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([
                $i + 1,
                \Carbon\Carbon::parse($m['date'])->format('Y-m-d'),
                $typeLabels[$m['type']] ?? $m['type'],
                $qty,
                $m['unit_price'] ?? '—',
                $m['reference'],
                $m['balance'],
            ], $rowStyle));
        }

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['رصيد آخر الفترة', '', '', '', '', '', $data['closing_stock'] . ' ' . ($product->unit ?? '')], $titleStyle));

        $writer->close();
        exit;
    }

    // ─── PDF ─────────────────────────────────────────────────────────────────


    public function exportStockStatusExcel(ReportRepositoryInterface $repo, ?int $categoryId, ?string $sellingType, bool $lowStockOnly, bool $showSold = false, bool $showWasted = false, bool $showPurchased = false, ?string $dateFrom = null, ?string $dateTo = null, bool $compactView = false, ?array $filterProductIds = null, ?string $searchName = null): void
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $data = $repo->stockStatus($categoryId, $sellingType, $lowStockOnly, $showSold, $showWasted, $showPurchased, $dateFrom, $dateTo, $filterProductIds, null, $searchName);
        if ($compactView) {
            $data = array_values(array_filter($data, fn($item) => $item['profit'] !== null));
        }

        $includedProducts = $repo->getIncludedProducts($filterProductIds, $searchName);
        $productNames = collect($includedProducts)->pluck('name')->toArray();
        $categoryName = $categoryId ? DB::table('categories')->where('id', $categoryId)->value('name') : null;

        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $n !== null ? ($isWhole($n) ? number_format($n, 0) : number_format($n, 2)) : '—';
        $statusLabels = ['ok' => 'جيد', 'warning' => 'تحذير', 'critical' => 'حرج'];

        if ($showPurchased) {
            if ($compactView) {
                $headers = ['#', 'المنتج', 'متوسط شراء (د.ل)', 'متوسط بيع (د.ل)', 'صافي كمية المبيعات', 'الربح (د.ل)'];
            } else {
                $headers = ['#', 'المنتج', 'إجمالي المشتراه', 'إجمالي المخزون', 'إجمالي المبيعات', 'إجمالي التالف', 'مرتجع مورد', 'متوسط ارجاع المورد', 'مرتجع زبائن', 'متوسط ارجاع الزبائن', 'متوسط شراء', 'متوسط بيع', 'الربح (د.ل)'];
            }
        } else {
            $headers = ['#', 'المنتج', 'التصنيف', 'المخزون', 'الحد الأدنى', 'الحالة', 'آخر شراء (د.ل)', 'متوسط شراء (د.ل)', 'آخر بيع (د.ل)', 'متوسط بيع (د.ل)'];
            if ($showSold)   $headers[] = 'إجمالي المبيع';
            if ($showWasted) $headers[] = 'إجمالي التالف';
        }

        $cppLines = [];
        if ($showPurchased) {
            $totalProfit = array_reduce($data, fn($carry, $item) => $carry + (float)($item['profit'] ?? 0), 0.0);
            $cppLines[] = ["#SUMMARY", "إجمالي الربح الكلي", $fmtN($totalProfit) . " د.ل"];
        }
        $cppLines[] = array_merge(["#TABLE_HEADER"], $headers);

        foreach ($data as $i => $p) {
            if ($showPurchased) {
                if ($compactView) {
                    $rowData = [
                        $i + 1, $p['name'], $fmtN($p['avg_purchase_cost']), $fmtN($p['avg_sale_price']),
                        $fmtN($p['net_sale_qty']) . ' ' . $p['unit'], $fmtN($p['profit'])
                    ];
                } else {
                    $rowData = [
                        $i + 1, $p['name'], $fmtN($p['total_purchased']) . ' ' . $p['unit'], $fmtN($p['stock']) . ' ' . $p['unit'],
                        $fmtN($p['total_sold']) . ' ' . $p['unit'], $fmtN($p['total_wasted']) . ' ' . $p['unit'],
                        $fmtN($p['total_return_out']) . ' ' . $p['unit'], $fmtN($p['avg_return_out_price']),
                        $fmtN($p['total_return_in']) . ' ' . $p['unit'], $fmtN($p['avg_return_in_price']),
                        $fmtN($p['avg_purchase_cost']), $fmtN($p['avg_sale_price']), $fmtN($p['profit'])
                    ];
                }
            } else {
                $rowData = [
                    $i + 1, $p['name'], $p['category'], $fmtN($p['stock']) . ' ' . $p['unit'],
                    $fmtN($p['min_stock']) . ' ' . $p['unit'], $statusLabels[$p['status']] ?? $p['status'],
                    $fmtN($p['last_purchase_cost']), $fmtN($p['avg_purchase_cost']),
                    $fmtN($p['last_sale_price']), $fmtN($p['avg_sale_price'])
                ];
                if ($showSold)   $rowData[] = $fmtN($p['total_sold'])   . ' ' . $p['unit'];
                if ($showWasted) $rowData[] = $fmtN($p['total_wasted']) . ' ' . $p['unit'];
            }
            $cppLines[] = array_merge(["#TABLE_ROW"], $rowData);
        }

        $filename = ($showPurchased ? 'profit-report-' : 'stock-status-') . now()->format('Y-m-d') . '.xlsx';

        if ($this->tryCppExport($showPurchased ? 'تقرير أرباح المنتجات' : 'تقرير المخزون الحالي', $dateFrom ?? 'البداية', $dateTo ?? now()->format('Y-m-d'), !empty($productNames) ? implode(', ', $productNames) : 'الكل', 'المخزون', 'table', $cppLines, $filename)) {
            return;
        }

        // OpenSpout Stream Fallback
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new \OpenSpout\Writer\XLSX\Writer();
        $options = $writer->getOptions();
        $options->setColumnWidth(10, 1);
        $options->setColumnWidth(40, 2);
        $options->setColumnWidth(25, 3);
        $options->setColumnWidth(25, 4);
        $options->setColumnWidth(25, 5);

        $writer->openToFile('php://output');
        $writer->getCurrentSheet()->setSheetView((new \OpenSpout\Writer\XLSX\Entity\SheetView())->withRightToLeft(true));

        $titleStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $infoStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withBackgroundColor('E3F2FD');

        $tblHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $rowStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(12);

        $grandTotalStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([$showPurchased ? 'تقرير أرباح المنتجات' : 'تقرير المخزون الحالي'], $titleStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['من تاريخ', $dateFrom ?? 'البداية'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إلى تاريخ', $dateTo ?? now()->format('Y-m-d')], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['المنتجات المشمولة في الحساب', !empty($productNames) ? implode(', ', $productNames) : 'الكل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['التصنيف', $categoryName ?: 'الكل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تاريخ الإنشاء', now()->format('Y-m-d H:i')], $infoStyle));

        if ($showPurchased) {
            $totalProfit = array_reduce($data, fn($carry, $item) => $carry + (float)($item['profit'] ?? 0), 0.0);
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إجمالي الربح الكلي', $fmtN($totalProfit) . ' د.ل'], $grandTotalStyle));
        }
        $writer->addRow(new \OpenSpout\Common\Entity\Row([]));

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle($headers, $tblHeaderStyle));

        foreach ($data as $i => $p) {
            if ($showPurchased) {
                if ($compactView) {
                    $rowData = [
                        $i + 1, $p['name'], $fmtN($p['avg_purchase_cost']), $fmtN($p['avg_sale_price']),
                        $fmtN($p['net_sale_qty']) . ' ' . $p['unit'], $fmtN($p['profit'])
                    ];
                } else {
                    $rowData = [
                        $i + 1, $p['name'], $fmtN($p['total_purchased']) . ' ' . $p['unit'], $fmtN($p['stock']) . ' ' . $p['unit'],
                        $fmtN($p['total_sold']) . ' ' . $p['unit'], $fmtN($p['total_wasted']) . ' ' . $p['unit'],
                        $fmtN($p['total_return_out']) . ' ' . $p['unit'], $fmtN($p['avg_return_out_price']),
                        $fmtN($p['total_return_in']) . ' ' . $p['unit'], $fmtN($p['avg_return_in_price']),
                        $fmtN($p['avg_purchase_cost']), $fmtN($p['avg_sale_price']), $fmtN($p['profit'])
                    ];
                }
            } else {
                $rowData = [
                    $i + 1, $p['name'], $p['category'], $fmtN($p['stock']) . ' ' . $p['unit'],
                    $fmtN($p['min_stock']) . ' ' . $p['unit'], $statusLabels[$p['status']] ?? $p['status'],
                    $fmtN($p['last_purchase_cost']), $fmtN($p['avg_purchase_cost']),
                    $fmtN($p['last_sale_price']), $fmtN($p['avg_sale_price'])
                ];
                if ($showSold)   $rowData[] = $fmtN($p['total_sold'])   . ' ' . $p['unit'];
                if ($showWasted) $rowData[] = $fmtN($p['total_wasted']) . ' ' . $p['unit'];
            }

            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle($rowData, $rowStyle));
        }

        $writer->close();
        exit;
    }


    public function exportInventoryCountExcel(ReportRepositoryInterface $repo, ?int $categoryId, ?string $sellingType, bool $lowStockOnly): void
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $data = $repo->stockStatus($categoryId, $sellingType, $lowStockOnly, false, false, false);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Tajawal')->setSize(13);
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setRightToLeft(true);
        $sheet->setTitle('نموذج الجرد');

        $row = 1;
        $headers = ['#', 'المنتج', 'التصنيف', 'المخزون النظامي', 'المخزون الفعلي', 'ملاحظات'];

        $lastCol = chr(ord('A') + count($headers) - 1);
        $sheet->fromArray($headers, null, 'A' . $row);
        $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A5F']],
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 15],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $row++;

        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $n !== null ? ($isWhole($n) ? number_format($n, 0) : number_format($n, 2)) : '—';

        foreach ($data as $i => $p) {
            $bg = $i % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
            $rowData = [
                $i + 1,
                $p['name'],
                $p['category'],
                $fmtN($p['stock']) . ' ' . $p['unit'],
                '', // المخزون الفعلي فارغ
                '', // ملاحظات فارغ
            ];

            $sheet->fromArray($rowData, null, 'A' . $row);
            $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
            $sheet->getStyle('D' . $row)->applyFromArray([
                'font' => ['bold' => true],
            ]);
            $row++;
        }

        foreach (range('A', $lastCol) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        $sheet->getColumnDimension('E')->setWidth(20);
        $sheet->getColumnDimension('F')->setWidth(30);

        $filename = 'inventory-count-' . now()->format('Y-m-d') . '.xlsx';
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');
        (new Xlsx($spreadsheet))->save('php://output');
        exit;
    }


    public function exportCustomerAgingExcel(ReportRepositoryInterface $repo, ?int $customerId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false): void
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $data = $repo->customerAging($customerId, $dateFrom, $dateTo, $showAllHistory, null);
        $customerName = $customerId
            ? DB::table('customers')->where('id', $customerId)->value('name')
            : 'جميع العملاء';

        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);
        $typeLabels = ['invoice' => 'فاتورة', 'payment' => 'دفعة', 'settlement' => 'تسوية', 'return' => 'مرتجع'];

        $filename = 'customer-aging-' . now()->format('Y-m-d') . '.xlsx';

        $cppLines = [];
        foreach ($data as $c) {
            $cppLines[] = ["#SUMMARY", "العميل: " . $c['customer_name'], "إجمالي الدين: " . $fmtN($c['total_debt']) . " د.ل"];
            $cppLines[] = ["#TABLE_HEADER", "", "المرجع", "النوع", "التاريخ", "المبلغ (د.ل)", "الرصيد (د.ل)"];
            foreach ($c['movements'] as $m) {
                $amountFmt = ($m['amount'] > 0 ? '+' : '') . $fmtN($m['amount']);
                $dateFmt   = $m['date'] ? \Carbon\Carbon::parse($m['date'])->format('Y-m-d') : '--';
                $cppLines[] = ["#TABLE_ROW", "", $m['ref'], $typeLabels[$m['type']] ?? $m['type'], $dateFmt, $amountFmt, $fmtN($m['balance'])];
            }
        }
        $totalDebt = array_sum(array_column($data, 'total_debt'));
        $cppLines[] = ["#SUMMARY", "الإجمالي الكلي", "إجمالي الديون: " . $fmtN($totalDebt) . " د.ل"];

        if ($this->tryCppExport('تقرير ديون العملاء', $dateFrom ? substr($dateFrom, 0, 10) : 'البداية', $dateTo ? substr($dateTo, 0, 10) : now()->format('Y-m-d'), $customerName, 'العميل', 'aging', $cppLines, $filename)) {
            return;
        }
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new \OpenSpout\Writer\XLSX\Writer();
        $options = $writer->getOptions();
        $options->setColumnWidth(10, 1);
        $options->setColumnWidth(40, 2);
        $options->setColumnWidth(25, 3);
        $options->setColumnWidth(25, 4);
        $options->setColumnWidth(25, 5);
        $options->setColumnWidth(25, 6);

        $writer->openToFile('php://output');
        $writer->getCurrentSheet()->setSheetView((new \OpenSpout\Writer\XLSX\Entity\SheetView())->withRightToLeft(true));

        $titleStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $infoStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withBackgroundColor('E3F2FD');

        $custHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(14)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0');

        $movHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(12)->withFontBold(true)
            ->withBackgroundColor('BBDEFB');

        $rowStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(12);

        $grandTotalStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تقرير ديون العملاء'], $titleStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['العميل', $customerName], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['من تاريخ', $dateFrom ? substr($dateFrom, 0, 10) : 'البداية'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إلى تاريخ', $dateTo ? substr($dateTo, 0, 10) : now()->format('Y-m-d')], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تاريخ الإنشاء', now()->format('Y-m-d H:i')], $infoStyle));
        $writer->addRow(new \OpenSpout\Common\Entity\Row([]));

        foreach ($data as $i => $c) {
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([
                'العميل: ' . $c['customer_name'] . ' — إجمالي الدين: ' . $fmtN($c['total_debt']) . ' د.ل'
            ], $custHeaderStyle));

            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['', 'المرجع', 'النوع', 'التاريخ', 'المبلغ (د.ل)', 'الرصيد (د.ل)'], $movHeaderStyle));

            foreach ($c['movements'] as $m) {
                $amountFmt = ($m['amount'] > 0 ? '+' : '') . $fmtN($m['amount']);
                $dateFmt   = $m['date'] ? \Carbon\Carbon::parse($m['date'])->format('Y-m-d') : '--';
                $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([
                    '',
                    $m['ref'],
                    $typeLabels[$m['type']] ?? $m['type'],
                    $dateFmt,
                    $amountFmt,
                    $fmtN($m['balance'])
                ], $rowStyle));
            }
            $writer->addRow(new \OpenSpout\Common\Entity\Row([]));
        }

        $totalDebt = array_sum(array_column($data, 'total_debt'));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['الإجمالي الكلي', 'إجمالي الديون: ' . $fmtN($totalDebt) . ' د.ل'], $grandTotalStyle));

        $writer->close();
        exit;
    }


    public function exportSupplierAgingExcel(ReportRepositoryInterface $repo, ?int $supplierId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false): void
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $data = $repo->supplierAging($supplierId, $dateFrom, $dateTo, $showAllHistory, null);
        $supplierName = $supplierId
            ? DB::table('suppliers')->where('id', $supplierId)->value('name')
            : 'جميع الموردين';

        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);
        $typeLabels = ['purchase' => 'شراء', 'payment' => 'دفعة', 'settlement' => 'تسوية', 'return' => 'مرتجع'];

        $filename = 'supplier-aging-' . now()->format('Y-m-d') . '.xlsx';

        $cppLines = [];
        foreach ($data as $s) {
            $cppLines[] = ["#SUMMARY", "المورد: " . $s['supplier_name'], "إجمالي الدين: " . $fmtN($s['total_debt']) . " د.ل"];
            $cppLines[] = ["#TABLE_HEADER", "", "المرجع", "النوع", "التاريخ", "المبلغ (د.ل)", "الرصيد (د.ل)"];
            foreach ($s['movements'] as $m) {
                $amountFmt = ($m['amount'] > 0 ? '+' : '') . $fmtN($m['amount']);
                $dateFmt   = $m['date'] ? \Carbon\Carbon::parse($m['date'])->format('Y-m-d') : '--';
                $cppLines[] = ["#TABLE_ROW", "", $m['ref'], $typeLabels[$m['type']] ?? $m['type'], $dateFmt, $amountFmt, $fmtN($m['balance'])];
            }
        }
        $totalDebt = array_sum(array_column($data, 'total_debt'));
        $cppLines[] = ["#SUMMARY", "الإجمالي الكلي", "إجمالي الديون: " . $fmtN($totalDebt) . " د.ل"];

        if ($this->tryCppExport('تقرير ديون الموردين', $dateFrom ? substr($dateFrom, 0, 10) : 'البداية', $dateTo ? substr($dateTo, 0, 10) : now()->format('Y-m-d'), $supplierName, 'المورد', 'aging', $cppLines, $filename)) {
            return;
        }
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new \OpenSpout\Writer\XLSX\Writer();
        $options = $writer->getOptions();
        $options->setColumnWidth(10, 1);
        $options->setColumnWidth(40, 2);
        $options->setColumnWidth(25, 3);
        $options->setColumnWidth(25, 4);
        $options->setColumnWidth(25, 5);
        $options->setColumnWidth(25, 6);

        $writer->openToFile('php://output');
        $writer->getCurrentSheet()->setSheetView((new \OpenSpout\Writer\XLSX\Entity\SheetView())->withRightToLeft(true));

        $titleStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $infoStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withBackgroundColor('E3F2FD');

        $suppHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(14)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0');

        $movHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(12)->withFontBold(true)
            ->withBackgroundColor('BBDEFB');

        $rowStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(12);

        $grandTotalStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تقرير ديون الموردين'], $titleStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['المورد', $supplierName], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['من تاريخ', $dateFrom ? substr($dateFrom, 0, 10) : 'البداية'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إلى تاريخ', $dateTo ? substr($dateTo, 0, 10) : now()->format('Y-m-d')], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تاريخ الإنشاء', now()->format('Y-m-d H:i')], $infoStyle));
        $writer->addRow(new \OpenSpout\Common\Entity\Row([]));

        foreach ($data as $i => $s) {
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([
                'المورد: ' . $s['supplier_name'] . ' — إجمالي الدين: ' . $fmtN($s['total_debt']) . ' د.ل'
            ], $suppHeaderStyle));

            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['', 'المرجع', 'النوع', 'التاريخ', 'المبلغ (د.ل)', 'الرصيد (د.ل)'], $movHeaderStyle));

            foreach ($s['movements'] as $m) {
                $amountFmt = ($m['amount'] > 0 ? '+' : '') . $fmtN($m['amount']);
                $dateFmt   = $m['date'] ? \Carbon\Carbon::parse($m['date'])->format('Y-m-d') : '--';
                $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([
                    '',
                    $m['ref'],
                    $typeLabels[$m['type']] ?? $m['type'],
                    $dateFmt,
                    $amountFmt,
                    $fmtN($m['balance'])
                ], $rowStyle));
            }
            $writer->addRow(new \OpenSpout\Common\Entity\Row([]));
        }

        $totalDebt = array_sum(array_column($data, 'total_debt'));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['الإجمالي الكلي', 'إجمالي الديون: ' . $fmtN($totalDebt) . ' د.ل'], $grandTotalStyle));

        $writer->close();
        exit;
    }


    public function exportSalesExcel(ReportRepositoryInterface $repo, ?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): void
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $data = $repo->sales($dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, false, $filterProductIds, $searchName);
        $includedProducts = $repo->getIncludedProducts($filterProductIds, $searchName);
        $productNames = collect($includedProducts)->pluck('name')->toArray();
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $userName          = $userId ? DB::table('users')->where('id', $userId)->value('name') : null;
        $customerName      = $customerId ? DB::table('customers')->where('id', $customerId)->value('name') : null;
        $paymentMethodName = $paymentMethodId ? DB::table('payment_methods')->where('id', $paymentMethodId)->value('name') : null;
        $categoryName      = $categoryId ? DB::table('categories')->where('id', $categoryId)->value('name') : null;

        $filename = 'sales-' . now()->format('Y-m-d') . '.xlsx';

        $cppLines = [];
        $cppLines[] = ["#SUMMARY", "إجمالي المبيعات", $fmtN($data['totalSales']) . " د.ل"];
        $cppLines[] = ["#SUMMARY", "عدد الفواتير", $data['invoicesCount']];
        $cppLines[] = ["#SUMMARY", "متوسط الفاتورة", $fmtN($data['avgInvoice']) . " د.ل"];
        $cppLines[] = ["#SUMMARY", "إجمالي المدفوع", $fmtN($data['totalPaid']) . " د.ل"];
        $cppLines[] = ["#SUMMARY", "إجمالي المتبقي", $fmtN($data['totalDue']) . " د.ل"];
        $cppLines[] = ["#TABLE_HEADER", "الشهر / التاريخ", "عدد الفواتير", "إجمالي المبيعات (د.ل)"];
        foreach ($data['monthly'] as $m) {
            $cppLines[] = ["#TABLE_ROW", $m['month'], $m['count'], $fmtN($m['total']) . " د.ل"];
            foreach ($m['days'] as $d) {
                $cppLines[] = ["#TABLE_ROW", "  " . $d['date'], $d['count'], $fmtN($d['total']) . " د.ل"];
            }
        }
        $this->tryCppExport('تقرير المبيعات العامة', $dateFrom ?? 'البداية', $dateTo ?? now()->format('Y-m-d'), !empty($productNames) ? implode(', ', $productNames) : 'الكل', 'المبيعات', 'summary', $cppLines, $filename);
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new \OpenSpout\Writer\XLSX\Writer();
        $options = $writer->getOptions();
        $options->setColumnWidth(30, 1);
        $options->setColumnWidth(25, 2);
        $options->setColumnWidth(30, 3);
        $options->setColumnWidth(25, 4);

        $writer->openToFile('php://output');
        $writer->getCurrentSheet()->setSheetView((new \OpenSpout\Writer\XLSX\Entity\SheetView())->withRightToLeft(true));

        $titleStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $infoStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withBackgroundColor('E3F2FD');

        $tblHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $sectionHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('2E7D32')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $monthHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withBackgroundColor('BBDEFB');

        $rowStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(12);

        $grandTotalStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        // ترويسة التقرير ومعلومات الفلاتر المحددة
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تقرير المبيعات العامة'], $titleStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['من تاريخ', $dateFrom ?? 'البداية'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إلى تاريخ', $dateTo ?? now()->format('Y-m-d')], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['البائع', $userName ?? 'الكل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['العميل', $customerName ?? 'الكل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['وسيلة الدفع', $paymentMethodName ?? 'الكل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['التصنيف', $categoryName ?? 'الكل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['المنتجات المشمولة في الحساب', !empty($productNames) ? implode(', ', $productNames) : ($searchName ? $searchName : 'الكل')], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تاريخ الإنشاء', now()->format('Y-m-d H:i')], $infoStyle));
        $writer->addRow(new \OpenSpout\Common\Entity\Row([]));

        // كروت الملخص المالي
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إجمالي المبيعات', $fmtN($data['totalSales']) . ' د.ل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['عدد الفواتير', $data['invoicesCount'] . ' فاتورة'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['متوسط الفاتورة', $fmtN($data['avgInvoice']) . ' د.ل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إجمالي المدفوع (المحصل)', $fmtN($data['totalPaid']) . ' د.ل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إجمالي المتبقي (الآجل)', $fmtN($data['totalDue']) . ' د.ل'], $infoStyle));
        $writer->addRow(new \OpenSpout\Common\Entity\Row([]));

        // جدول تفصيل وسائل الدفع والتحصيل
        if (!empty($data['paymentMethodsBreakdown'])) {
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تفصيل وسائل الدفع والتحصيل'], $sectionHeaderStyle));
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['وسيلة الدفع', 'عدد العمليات', 'إجمالي المبلغ (د.ل)', 'النسبة المئوية'], $tblHeaderStyle));
            foreach ($data['paymentMethodsBreakdown'] as $pm) {
                $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([
                    $pm['name'],
                    $pm['count'] . ' عملية',
                    $fmtN($pm['total_amount']) . ' د.ل',
                    $pm['percentage'] . '%'
                ], $rowStyle));
            }
            $writer->addRow(new \OpenSpout\Common\Entity\Row([]));
        }

        // جدول الحركة الشهرية واليومية
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['الشهر / التاريخ', 'عدد الفواتير', 'إجمالي المبيعات (د.ل)'], $tblHeaderStyle));

        foreach ($data['monthly'] as $m) {
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([$m['month'], $m['count'], $fmtN($m['total']) . ' د.ل'], $monthHeaderStyle));
            foreach ($m['days'] as $d) {
                $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['  ' . $d['date'], $d['count'], $fmtN($d['total']) . ' د.ل'], $rowStyle));
            }
        }

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['الإجمالي الكلي', $data['invoicesCount'] . ' فاتورة', $fmtN($data['totalSales']) . ' د.ل'], $grandTotalStyle));

        $writer->close();
        exit;
    }


    public function exportSalesCustomerInvoicesExcel(ReportRepositoryInterface $repo, ?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): void
    {
        @ini_set('memory_limit', '2048M');
        @set_time_limit(600);

        $data = $repo->salesCustomerInvoices($dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, $filterProductIds, $searchName, null);
        $includedProducts = $repo->getIncludedProducts($filterProductIds, $searchName);
        $productNames = collect($includedProducts)->pluck('name')->toArray();

        $userName          = $userId ? DB::table('users')->where('id', $userId)->value('name') : null;
        $customerName      = $customerId ? DB::table('customers')->where('id', $customerId)->value('name') : null;
        $paymentMethodName = $paymentMethodId ? DB::table('payment_methods')->where('id', $paymentMethodId)->value('name') : null;
        $categoryName      = $categoryId ? DB::table('categories')->where('id', $categoryId)->value('name') : null;

        $totalInvoices = array_sum(array_column($data, 'invoice_count'));
        $grandAmount   = array_sum(array_column($data, 'total_amount'));
        $totalPaid     = array_sum(array_column($data, 'total_paid'));
        $totalDue      = array_sum(array_column($data, 'total_due'));

        $paymentMethodsBreakdown = $repo->getSalesPaymentMethodsBreakdown($dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, $filterProductIds, $searchName, (float)$totalPaid);

        $filename = 'sales-customer-invoices-' . now()->format('Y-m-d') . '.xlsx';
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new \OpenSpout\Writer\XLSX\Writer();
        
        $options = $writer->getOptions();
        $options->setColumnWidth(48, 1);
        $options->setColumnWidth(42, 2);
        $options->setColumnWidth(22, 3);
        $options->setColumnWidth(22, 4);
        $options->setColumnWidth(26, 5);

        $writer->openToFile('php://output');
        $writer->getCurrentSheet()->setSheetView((new \OpenSpout\Writer\XLSX\Entity\SheetView())->withRightToLeft(true));

        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $titleStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $infoStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withBackgroundColor('E3F2FD');

        $sectionHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('2E7D32')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $customerStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(14)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0');

        $invHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withBackgroundColor('BBDEFB');

        $tblHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(12)->withFontBold(true)
            ->withBackgroundColor('F5F5F5')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $rowStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(12);

        $subtotalStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(14)->withFontBold(true)
            ->withBackgroundColor('E8EAF6');

        $grandTotalStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        // ترويسة التقرير ومعلومات الفلاتر
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تقرير فواتير المبيعات حسب العملاء'], $titleStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['من تاريخ', $dateFrom ?? 'البداية'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إلى تاريخ', $dateTo ?? now()->format('Y-m-d')], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['البائع', $userName ?? 'الكل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['العميل', $customerName ?? 'الكل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['وسيلة الدفع', $paymentMethodName ?? 'الكل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['التصنيف', $categoryName ?? 'الكل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['المنتجات المشمولة في الحساب', !empty($productNames) ? implode(', ', $productNames) : ($searchName ? $searchName : 'الكل')], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تاريخ الإنشاء', now()->format('Y-m-d H:i')], $infoStyle));
        $writer->addRow(new \OpenSpout\Common\Entity\Row([]));

        // كروت الملخص المالي
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إجمالي المبيعات', $fmtN($grandAmount) . ' د.ل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إجمالي المدفوع (المحصل)', $fmtN($totalPaid) . ' د.ل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إجمالي المتبقي (الآجل)', $fmtN($totalDue) . ' د.ل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['عدد الفواتير', $totalInvoices . ' فاتورة'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['عدد العملاء', count($data) . ' عميل'], $infoStyle));
        $writer->addRow(new \OpenSpout\Common\Entity\Row([]));

        // جدول تفصيل وسائل الدفع والتحصيل
        if (!empty($paymentMethodsBreakdown)) {
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تفصيل وسائل الدفع والتحصيل'], $sectionHeaderStyle));
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['وسيلة الدفع', 'عدد العمليات', 'إجمالي المبلغ (د.ل)', 'النسبة المئوية'], $tblHeaderStyle));
            foreach ($paymentMethodsBreakdown as $pm) {
                $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([
                    $pm['name'],
                    $pm['count'] . ' عملية',
                    $fmtN($pm['total_amount']) . ' د.ل',
                    $pm['percentage'] . '%'
                ], $rowStyle));
            }
            $writer->addRow(new \OpenSpout\Common\Entity\Row([]));
        }

        // تفاصيل فواتير العملاء
        foreach ($data as $entry) {
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([$entry['customer_name'] . ' — ' . $entry['invoice_count'] . ' فاتورة — ' . $fmtN($entry['total_amount']) . ' د.ل (مدفوع: ' . $fmtN($entry['total_paid'] ?? 0) . ' / متبقي: ' . $fmtN($entry['total_due'] ?? 0) . ')'], $customerStyle));
            
            foreach ($entry['invoices'] as $inv) {
                $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['INV#' . $inv['id'], substr($inv['date'], 0, 10), 'الإجمالي: ' . $fmtN($inv['total']) . ' د.ل', 'المدفوع: ' . $fmtN($inv['paid_amount'] ?? 0), 'المتبقي: ' . $fmtN($inv['due_amount'] ?? 0)], $invHeaderStyle));
                $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['العدد', 'المنتج', 'الحجم', 'السعر', 'الإجمالي'], $tblHeaderStyle));

                foreach ($inv['items'] as $item) {
                    $item = (array) $item;
                    $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([
                        $item['count'] > 1 ? $item['count'] : '',
                        (!empty($item['is_matched']) ? '★ ' : '') . $item['product_name'],
                        $fmtN($item['quantity']),
                        $fmtN($item['unit_price']),
                        $fmtN($item['line_total']),
                    ], $rowStyle));
                }
            }

            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إجمالي العميل', '', '', '', $fmtN($entry['total_amount']) . ' د.ل'], $subtotalStyle));
            $writer->addRow(new \OpenSpout\Common\Entity\Row([]));
        }

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['الإجمالي الكلي', '', '', '', $fmtN($grandAmount) . ' د.ل'], $grandTotalStyle));

        $writer->close();
        exit;
    }


    public function exportPurchasesExcel(ReportRepositoryInterface $repo, ?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $paymentMethodId = null, ?int $categoryId = null, ?array $filterProductIds = null, ?string $searchName = null): void
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $data = $repo->purchases($dateFrom, $dateTo, $userId, $supplierId, $paymentMethodId, $categoryId, false, $filterProductIds, $searchName);
        $includedProducts = $repo->getIncludedProducts($filterProductIds, $searchName);
        $productNames = collect($includedProducts)->pluck('name')->toArray();
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $filename = 'purchases-' . now()->format('Y-m-d') . '.xlsx';

        $cppLines = [];
        $cppLines[] = ["#SUMMARY", "إجمالي المشتريات", $fmtN($data['totalPurchases']) . " د.ل"];
        $cppLines[] = ["#SUMMARY", "عدد الفواتير", $data['purchasesCount']];
        $cppLines[] = ["#SUMMARY", "متوسط الفاتورة", $fmtN($data['avgPurchase']) . " د.ل"];
        $cppLines[] = ["#SUMMARY", "إجمالي المدفوع", $fmtN($data['totalPaid']) . " د.ل"];
        $cppLines[] = ["#SUMMARY", "إجمالي المتبقي", $fmtN($data['totalDue']) . " د.ل"];
        $cppLines[] = ["#TABLE_HEADER", "الشهر / التاريخ", "عدد الفواتير", "إجمالي المشتريات (د.ل)"];
        foreach ($data['monthly'] as $m) {
            $cppLines[] = ["#TABLE_ROW", $m['month'], $m['count'], $fmtN($m['total']) . " د.ل"];
            foreach ($m['days'] as $d) {
                $cppLines[] = ["#TABLE_ROW", "  " . $d['date'], $d['count'], $fmtN($d['total']) . " د.ل"];
            }
        }
        $this->tryCppExport('تقرير المشتريات العامة', $dateFrom ?? 'البداية', $dateTo ?? now()->format('Y-m-d'), !empty($productNames) ? implode(', ', $productNames) : 'الكل', 'المشتريات', 'summary', $cppLines, $filename);
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new \OpenSpout\Writer\XLSX\Writer();
        $options = $writer->getOptions();
        $options->setColumnWidth(30, 1);
        $options->setColumnWidth(25, 2);
        $options->setColumnWidth(30, 3);

        $writer->openToFile('php://output');
        $writer->getCurrentSheet()->setSheetView((new \OpenSpout\Writer\XLSX\Entity\SheetView())->withRightToLeft(true));

        $titleStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $infoStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withBackgroundColor('E3F2FD');

        $tblHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $monthHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withBackgroundColor('BBDEFB');

        $rowStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(12);

        $grandTotalStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تقرير المشتريات العامة'], $titleStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['من تاريخ', $dateFrom ?? 'البداية'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إلى تاريخ', $dateTo ?? now()->format('Y-m-d')], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['المنتجات المشمولة في الحساب', !empty($productNames) ? implode(', ', $productNames) : 'الكل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تاريخ الإنشاء', now()->format('Y-m-d H:i')], $infoStyle));
        $writer->addRow(new \OpenSpout\Common\Entity\Row([]));

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إجمالي المشتريات', $fmtN($data['totalPurchases']) . ' د.ل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['عدد الفواتير', $data['purchasesCount']], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['متوسط الفاتورة', $fmtN($data['avgPurchase']) . ' د.ل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إجمالي المدفوع', $fmtN($data['totalPaid']) . ' د.ل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إجمالي المتبقي', $fmtN($data['totalDue']) . ' د.ل'], $infoStyle));
        $writer->addRow(new \OpenSpout\Common\Entity\Row([]));

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['الشهر / التاريخ', 'عدد الفواتير', 'إجمالي المشتريات (د.ل)'], $tblHeaderStyle));

        foreach ($data['monthly'] as $m) {
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([$m['month'], $m['count'], $fmtN($m['total']) . ' د.ل'], $monthHeaderStyle));
            foreach ($m['days'] as $d) {
                $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['  ' . $d['date'], $d['count'], $fmtN($d['total']) . ' د.ل'], $rowStyle));
            }
        }

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['الإجمالي الكلي', $data['purchasesCount'] . ' فاتورة', $fmtN($data['totalPurchases']) . ' د.ل'], $grandTotalStyle));

        $writer->close();
        exit;
    }


    public function exportPurchasesSupplierInvoicesExcel(ReportRepositoryInterface $repo, ?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): void
    {
        @ini_set('memory_limit', '2048M');
        @set_time_limit(600);

        $cppExe = PHP_OS_FAMILY === 'Windows' ? base_path('bin' . DIRECTORY_SEPARATOR . 'export_xlsx.exe') : base_path('bin' . DIRECTORY_SEPARATOR . 'export_xlsx');
        if (file_exists($cppExe)) {
            $storageDir = storage_path('app');
            if (!file_exists($storageDir)) { @mkdir($storageDir, 0777, true); }

            $tmpTsv  = $storageDir . DIRECTORY_SEPARATOR . 'cpp_db_' . uniqid() . '.tsv';
            $tmpXlsx = $storageDir . DIRECTORY_SEPARATOR . 'cpp_exp_' . uniqid() . '.xlsx';

            $dfStr = $dateFrom ? $dateFrom . ' 00:00:00' : '1970-01-01 00:00:00';
            $dtStr = $dateTo   ? $dateTo   . ' 23:59:59' : '2099-12-31 23:59:59';

            $sql = "SELECT COALESCE(sp.name, 'مورد عام'), p.id, DATE_FORMAT(p.created_at, '%Y-%m-%d'), p.total, COUNT(pi.id) AS item_count, COALESCE(pr.name, 'منتج'), '-', SUM(pi.quantity), pi.unit_cost, SUM(pi.line_total) FROM purchases p LEFT JOIN suppliers sp ON sp.id = p.supplier_id LEFT JOIN purchase_items pi ON pi.purchase_id = p.id LEFT JOIN products pr ON pr.id = pi.product_id WHERE p.deleted_at IS NULL AND p.created_at >= '{$dfStr}' AND p.created_at <= '{$dtStr}' GROUP BY p.id, sp.name, p.created_at, p.total, pi.product_id, pi.unit_cost, pr.name ORDER BY sp.name ASC, p.id DESC";

            $includedProducts = $repo->getIncludedProducts($filterProductIds, $searchName);
            $productNames = collect($includedProducts)->pluck('name')->toArray();
            $productNamesStr = !empty($productNames) ? implode(', ', $productNames) : 'الكل';
            $createdAtStr = now()->format('Y-m-d H:i');

            $pdo = \Illuminate\Support\Facades\DB::connection()->getPdo();
            $f = fopen($tmpTsv, 'w');

            fwrite($f, "#META\t" . ($dateFrom ?? 'البداية') . "\t" . ($dateTo ?? now()->format('Y-m-d')) . "\t" . $productNamesStr . "\t" . $createdAtStr . "\tتقرير فواتير المشتريات حسب الموردين\tالمورد\n");

            $stmt = $pdo->query($sql);
            while ($row = $stmt->fetch(\PDO::FETCH_NUM)) {
                fwrite($f, implode("\t", $row) . "\n");
            }
            fclose($f);

            $cmdCpp = '"' . $cppExe . '" "' . $tmpXlsx . '" "' . $tmpTsv . '"';
            exec($cmdCpp, $out, $code);

            if ($code === 0 && file_exists($tmpXlsx) && filesize($tmpXlsx) > 0) {
                $filename = 'فواتير_الموردين_' . ($dateFrom ?? 'all') . '_' . ($dateTo ?? now()->format('Y-m-d')) . '.xlsx';
                header('X-Export-Engine: C++ Static Binary Exporter');
                header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                header('Content-Disposition: attachment; filename="' . $filename . '"');
                header('Content-Length: ' . filesize($tmpXlsx));
                readfile($tmpXlsx);
                @unlink($tmpTsv);
                @unlink($tmpXlsx);
                exit;
            }
            @unlink($tmpTsv);
            @unlink($tmpXlsx);
        }

        $data = $repo->purchasesSupplierInvoices($dateFrom, $dateTo, $userId, $supplierId, $categoryId, $filterProductIds, $searchName, null);
        $includedProducts = $repo->getIncludedProducts($filterProductIds, $searchName);
        $productNames = collect($includedProducts)->pluck('name')->toArray();
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $totalPurchases = array_sum(array_column($data, 'purchase_count'));

        // Use OpenSpout Ultra-Fast Streamed XLSX Writer for large datasets to prevent memory exhaustion and browser timeouts
        if ($totalPurchases > 2000) {
            $filename = 'فواتير_الموردين_' . ($dateFrom ?? 'all') . '_' . ($dateTo ?? now()->format('Y-m-d')) . '.xlsx';
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Cache-Control: max-age=0');

            $writer = new \OpenSpout\Writer\XLSX\Writer();

            // Set Natural Wide Column Widths to prevent text compression
            $options = $writer->getOptions();
            $options->setColumnWidth(48, 1); // Column A: Supplier / Title
            $options->setColumnWidth(42, 2); // Column B: Product Name / Date
            $options->setColumnWidth(22, 3); // Column C: Size / Quantity
            $options->setColumnWidth(22, 4); // Column D: Cost
            $options->setColumnWidth(26, 5); // Column E: Line Total

            $writer->openToFile('php://output');

            // Set Sheet Orientation Right-To-Left (RTL) for Arabic Excel layout
            $writer->getCurrentSheet()->setSheetView((new \OpenSpout\Writer\XLSX\Entity\SheetView())->withRightToLeft(true));

            // Style definitions with Tajawal font, colors, bolding, and alignment
            $titleStyle = (new \OpenSpout\Common\Entity\Style\Style())
                ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
                ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
                ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

            $infoStyle = (new \OpenSpout\Common\Entity\Style\Style())
                ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
                ->withBackgroundColor('E3F2FD');

            $supplierStyle = (new \OpenSpout\Common\Entity\Style\Style())
                ->withFontName('Tajawal')->withFontSize(14)->withFontBold(true)
                ->withFontColor('FFFFFF')->withBackgroundColor('1565C0');

            $invHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
                ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
                ->withBackgroundColor('BBDEFB');

            $tblHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
                ->withFontName('Tajawal')->withFontSize(12)->withFontBold(true)
                ->withBackgroundColor('F5F5F5')
                ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

            $rowStyle = (new \OpenSpout\Common\Entity\Style\Style())
                ->withFontName('Tajawal')->withFontSize(12);

            $subtotalStyle = (new \OpenSpout\Common\Entity\Style\Style())
                ->withFontName('Tajawal')->withFontSize(14)->withFontBold(true)
                ->withBackgroundColor('E8EAF6');

            $grandTotalStyle = (new \OpenSpout\Common\Entity\Style\Style())
                ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
                ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
                ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تقرير فواتير الموردين'], $titleStyle));
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['من تاريخ', $dateFrom ?? 'البداية'], $infoStyle));
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إلى تاريخ', $dateTo ?? now()->format('Y-m-d')], $infoStyle));
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['المنتجات المشمولة في الحساب', !empty($productNames) ? implode(', ', $productNames) : 'الكل'], $infoStyle));
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تاريخ الإنشاء', now()->format('Y-m-d H:i')], $infoStyle));
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValues([]));

            foreach ($data as $entry) {
                $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([$entry['supplier_name'] . ' — ' . $entry['purchase_count'] . ' فاتورة — ' . $fmtN($entry['total_amount'])], $supplierStyle));
                
                foreach ($entry['purchases'] as $inv) {
                    $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['INV#' . $inv['id'], substr($inv['date'], 0, 10), $fmtN($inv['total'])], $invHeaderStyle));
                    $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['العدد', 'المنتج', 'الحجم', 'السعر', 'الإجمالي'], $tblHeaderStyle));

                    foreach ($inv['items'] as $item) {
                        $item = (array) $item;
                        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([
                            $item['count'] > 1 ? $item['count'] : '',
                            (!empty($item['is_matched']) ? '★ ' : '') . $item['product_name'],
                            $fmtN($item['quantity']),
                            $fmtN($item['unit_cost']),
                            $fmtN($item['quantity'] * $item['count'] * $item['unit_cost']),
                        ], $rowStyle));
                    }
                }

                $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['الإجمالي', '', '', '', $fmtN($entry['total_amount'])], $subtotalStyle));
                $writer->addRow(\OpenSpout\Common\Entity\Row::fromValues([]));
            }

            $grandAmount = array_sum(array_column($data, 'total_amount'));
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['الإجمالي الكلي', '', '', '', $fmtN($grandAmount)], $grandTotalStyle));

            $writer->close();
            exit;
        }

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Tajawal')->setSize(13);
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setRightToLeft(true);
        $sheet->setTitle('فواتير الموردين');

        $row = 1;
        $infoRows = [
            ['تقرير فواتير الموردين', ''],
            ['من تاريخ', $dateFrom ?? 'البداية'],
            ['إلى تاريخ', $dateTo ?? now()->format('Y-m-d')],
            ['المنتجات المشمولة في الحساب', !empty($productNames) ? $productNames : 'الكل'],
            ['تاريخ الإنشاء', now()->format('Y-m-d H:i')],
        ];

        foreach ($infoRows as $info) {
            $cells = is_array($info[1]) ? array_merge([$info[0]], $info[1]) : [$info[0], $info[1]];
            $sheet->fromArray($cells, null, 'A' . $row);
            $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($cells));
            $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E3F2FD']],
                'font'    => ['bold' => true, 'size' => 15],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
            $row++;
        }
        $row++;

        foreach ($data as $entry) {
            $sheet->setCellValue('A' . $row, $entry['supplier_name'] . ' — ' . $entry['purchase_count'] . ' فاتورة — ' . $fmtN($entry['total_amount']));
            $sheet->mergeCells('A' . $row . ':E' . $row);
            $sheet->getStyle('A' . $row)->applyFromArray([
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1565C0']],
                'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 15],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
            $row++;

            foreach ($entry['purchases'] as $p) {
                $sheet->fromArray(['PO#' . $p['id'], substr($p['date'], 0, 10), $fmtN($p['total'])], null, 'A' . $row);
                $sheet->getStyle('A' . $row . ':C' . $row)->applyFromArray([
                    'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'BBDEFB']],
                    'font'    => ['bold' => true],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                ]);
                $row++;

                $sheet->fromArray(['العدد', 'المنتج', 'الحجم', 'التكلفة', 'المبلغ'], null, 'A' . $row);
                $sheet->getStyle('A' . $row . ':E' . $row)->applyFromArray([
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F5F5F5']],
                    'font'      => ['bold' => true],
                    'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
                $row++;

                foreach ($p['items'] as $item) {
                    $item = (array) $item;
                    $sheet->fromArray([
                        $item['count'] > 1 ? $item['count'] : '',
                        ($item['is_matched'] ? '★ ' : '') . $item['product_name'],
                        $fmtN($item['quantity']),
                        $fmtN($item['unit_cost']),
                        $fmtN($item['quantity'] * $item['count'] * $item['unit_cost']),
                    ], null, 'A' . $row);
                    $sheet->getStyle('A' . $row . ':E' . $row)->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                    ]);
                    if ($item['count'] > 1) {
                        $sheet->getStyle('A' . $row)->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E3F2FD']],
                            'font' => ['bold' => true, 'color' => ['rgb' => '1565C0']],
                            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                        ]);
                    }
                    if ($item['is_matched']) {
                        $sheet->getStyle('B' . $row)->applyFromArray([
                            'font' => ['color' => ['rgb' => 'D97706']],
                        ]);
                        $sheet->getStyle('A' . $row . ':E' . $row)->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FEF3C7']],
                        ]);
                    }
                    $row++;
                }
            }

            $sheet->fromArray(['الإجمالي', '', '', '', $fmtN($entry['total_amount'])], null, 'A' . $row);
            $sheet->getStyle('A' . $row . ':E' . $row)->applyFromArray([
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E8EAF6']],
                'font'    => ['bold' => true, 'size' => 15],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
            $row += 2;
        }

        if ($matchedTotal > 0) {
            $sheet->fromArray(['إجمالي نتائج البحث', '', '', '', $fmtN($matchedTotal)], null, 'A' . $row);
            $sheet->getStyle('A' . $row . ':E' . $row)->applyFromArray([
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FEF3C7']],
                'font'    => ['bold' => true, 'color' => ['rgb' => 'D97706'], 'size' => 15],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
            $row++;
        }

        $grandAmount = array_sum(array_column($data, 'total_amount'));
        $sheet->fromArray(['الإجمالي الكلي', '', '', '', $fmtN($grandAmount)], null, 'A' . $row);
        $sheet->getStyle('A' . $row . ':E' . $row)->applyFromArray([
            'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1565C0']],
            'font'    => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 15],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);
        $row++;

        foreach (range('A', 'E') as $col) $sheet->getColumnDimension($col)->setAutoSize(true);

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="فواتير_الموردين_' . ($dateFrom ?? 'all') . '_' . ($dateTo ?? now()->format('Y-m-d')) . '.xlsx"');
        header('Cache-Control: max-age=0');
        (new Xlsx($spreadsheet))->save('php://output');
        exit;
    }


    public function exportReturnsExcel(ReportRepositoryInterface $repo, ?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): void
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $data = $repo->returns($dateFrom, $dateTo, $userId, $customerId, $supplierId, $categoryId, $filterProductIds, $searchName);
        $includedProducts = $repo->getIncludedProducts($filterProductIds, $searchName);
        $productNames = collect($includedProducts)->pluck('name')->toArray();
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $filename = 'returns-' . now()->format('Y-m-d') . '.xlsx';

        $cppLines = [];
        $cppLines[] = ["#SUMMARY", "مرتجعات العملاء (إجمالي)", $fmtN($data['customerReturnsTotal']) . " د.ل"];
        $cppLines[] = ["#SUMMARY", "مرتجعات العملاء (عدد)", $data['customerReturnsCount']];
        $cppLines[] = ["#SUMMARY", "مرتجعات الموردين (إجمالي)", $fmtN($data['supplierReturnsTotal']) . " د.ل"];
        $cppLines[] = ["#SUMMARY", "مرتجعات الموردين (عدد)", $data['supplierReturnsCount']];
        $cppLines[] = ["#SUMMARY", "إجمالي المبيعات", $fmtN($data['totalSales']) . " د.ل"];
        $cppLines[] = ["#SUMMARY", "نسبة المرتجعات", $data['returnRate'] !== null ? $data['returnRate'] . '%' : '—'];

        $cppLines[] = ["#TABLE_HEADER", "مرتجعات العملاء"];
        $cppLines[] = ["#TABLE_HEADER", "الشهر", "عدد الفواتير", "الإجمالي (د.ل)"];
        foreach ($data['customerMonthly'] as $m) {
            $cppLines[] = ["#TABLE_ROW", $m['month'], $m['count'], $fmtN($m['total']) . " د.ل"];
        }

        $cppLines[] = ["#TABLE_HEADER", "مرتجعات الموردين"];
        $cppLines[] = ["#TABLE_HEADER", "الشهر", "عدد الفواتير", "الإجمالي (د.ل)"];
        foreach ($data['supplierMonthly'] as $m) {
            $cppLines[] = ["#TABLE_ROW", $m['month'], $m['count'], $fmtN($m['total']) . " د.ل"];
        }

        if ($this->tryCppExport('تقرير المرتجعات العامة', $dateFrom ?? 'البداية', $dateTo ?? now()->format('Y-m-d'), !empty($productNames) ? implode(', ', $productNames) : 'الكل', 'المرتجعات', 'summary', $cppLines, $filename)) {
            return;
        }

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new \OpenSpout\Writer\XLSX\Writer();
        $options = $writer->getOptions();
        $options->setColumnWidth(30, 1);
        $options->setColumnWidth(25, 2);
        $options->setColumnWidth(30, 3);

        $writer->openToFile('php://output');
        $writer->getCurrentSheet()->setSheetView((new \OpenSpout\Writer\XLSX\Entity\SheetView())->withRightToLeft(true));

        $titleStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(15)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $infoStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withBackgroundColor('E3F2FD');

        $tblHeaderStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(13)->withFontBold(true)
            ->withFontColor('FFFFFF')->withBackgroundColor('1565C0')
            ->withCellAlignment(\OpenSpout\Common\Entity\Style\CellAlignment::CENTER);

        $rowStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->withFontName('Tajawal')->withFontSize(12);

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تقرير المرتجعات'], $titleStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['من تاريخ', $dateFrom ?? 'البداية'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إلى تاريخ', $dateTo ?? now()->format('Y-m-d')], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['المنتجات المشمولة في الحساب', !empty($productNames) ? implode(', ', $productNames) : 'الكل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['تاريخ الإنشاء', now()->format('Y-m-d H:i')], $infoStyle));
        $writer->addRow(new \OpenSpout\Common\Entity\Row([]));

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['مرتجعات العملاء (إجمالي)', $fmtN($data['customerReturnsTotal']) . ' د.ل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['مرتجعات العملاء (عدد)', $data['customerReturnsCount']], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['مرتجعات الموردين (إجمالي)', $fmtN($data['supplierReturnsTotal']) . ' د.ل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['مرتجعات الموردين (عدد)', $data['supplierReturnsCount']], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['إجمالي المبيعات', $fmtN($data['totalSales']) . ' د.ل'], $infoStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['نسبة المرتجعات', $data['returnRate'] !== null ? $data['returnRate'] . '%' : '—'], $infoStyle));
        $writer->addRow(new \OpenSpout\Common\Entity\Row([]));

        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['مرتجعات العملاء'], $tblHeaderStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['الشهر', 'عدد الفواتير', 'الإجمالي (د.ل)'], $tblHeaderStyle));
        foreach ($data['customerMonthly'] as $m) {
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([$m['month'], $m['count'], $fmtN($m['total']) . ' د.ل'], $rowStyle));
        }

        $writer->addRow(new \OpenSpout\Common\Entity\Row([]));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['مرتجعات الموردين'], $tblHeaderStyle));
        $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle(['الشهر', 'عدد الفواتير', 'الإجمالي (د.ل)'], $tblHeaderStyle));
        foreach ($data['supplierMonthly'] as $m) {
            $writer->addRow(\OpenSpout\Common\Entity\Row::fromValuesWithStyle([$m['month'], $m['count'], $fmtN($m['total']) . ' د.ل'], $rowStyle));
        }

        $writer->close();
        exit;
    }


    public function exportReturnsDetailsExcel(ReportRepositoryInterface $repo, ?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, string $type, ?string $searchName = null): void
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $data    = $repo->returnsDetails($dateFrom, $dateTo, $userId, $customerId, $supplierId, $categoryId, $type, $searchName);
        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Tajawal')->setSize(13);
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setRightToLeft(true);
        $sheet->setTitle('تفاصيل المرتجعات');

        $row = 1;
        foreach ([
            ['تقرير تفاصيل المرتجعات', ''],
            ['من تاريخ', $dateFrom ?? 'البداية'],
            ['إلى تاريخ', $dateTo ?? now()->format('Y-m-d')],
            ['النوع', match($type) { 'customer' => 'مرتجعات العملاء', 'supplier' => 'مرتجعات الموردين', default => 'الكل' }],
            ['تاريخ الإنشاء', now()->format('Y-m-d H:i')],
        ] as $info) {
            $sheet->setCellValue('A' . $row, $info[0]);
            $sheet->setCellValue('B' . $row, $info[1]);
            $sheet->getStyle('A' . $row . ':B' . $row)->applyFromArray([
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FEF2F2']],
                'font'    => ['bold' => true, 'size' => 15],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
            $row++;
        }
        $row++;

        foreach ($data as $entry) {
            $color = $entry['entity_type'] === 'customer' ? 'DC2626' : 'D97706';
            $bg    = $entry['entity_type'] === 'customer' ? 'FEE2E2' : 'FEF3C7';

            $sheet->setCellValue('A' . $row, $entry['entity_name'] . ' — ' . $entry['return_count'] . ' مرتجع — ' . $fmtN($entry['total_amount']));
            $sheet->mergeCells('A' . $row . ':E' . $row);
            $sheet->getStyle('A' . $row)->applyFromArray([
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $color]],
                'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 15],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
            $row++;

            foreach ($entry['returns'] as $r) {
                $prefix = $entry['entity_type'] === 'customer' ? 'RET#' : 'PRET#';
                $sheet->fromArray([$prefix . $r['id'], substr($r['date'], 0, 10), $fmtN($r['total'])], null, 'A' . $row);
                $sheet->getStyle('A' . $row . ':C' . $row)->applyFromArray([
                    'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                    'font'    => ['bold' => true],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                ]);
                $row++;

                $sheet->fromArray(['عدد', 'المنتج', 'حجم', 'سعر', 'الإجمالي'], null, 'A' . $row);
                $sheet->getStyle('A' . $row . ':E' . $row)->applyFromArray([
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F5F5F5']],
                    'font'      => ['bold' => true],
                    'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
                $row++;

                foreach ($r['items'] as $item) {
                    $item = (array) $item;
                    $sheet->fromArray([
                        $item['count'],
                        $item['product_name'],
                        $item['size_label'] ?? '—',
                        $fmtN($item['unit_price']),
                        $fmtN($item['line_total']),
                    ], null, 'A' . $row);
                    $sheet->getStyle('A' . $row . ':E' . $row)->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                    ]);
                    $sheet->getStyle('A' . $row)->applyFromArray([
                        'font'      => ['bold' => true, 'color' => ['rgb' => '1565C0']],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    ]);
                    $row++;
                }
            }

            $sheet->fromArray(['الإجمالي', '', '', '', $fmtN($entry['total_amount'])], null, 'A' . $row);
            $sheet->getStyle('A' . $row . ':E' . $row)->applyFromArray([
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E8EAF6']],
                'font'    => ['bold' => true, 'size' => 15],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
            $row += 2;
        }

        foreach (range('A', 'E') as $col) $sheet->getColumnDimension($col)->setAutoSize(true);

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="تفاصيل_المرتجعات_' . ($dateFrom ?? 'all') . '_' . ($dateTo ?? now()->format('Y-m-d')) . '.xlsx"');
        header('Cache-Control: max-age=0');
        (new Xlsx($spreadsheet))->save('php://output');
        exit;
    }


    public function exportProfitAnalysisExcel(ReportRepositoryInterface $repo, ?string $dateFrom, ?string $dateTo, ?array $filterProductIds = null, ?string $searchName = null): void
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $data = $repo->dailyProfitSummary($dateFrom, $dateTo, $filterProductIds, null, $searchName);

        $productNames = collect($data['included_products'])->pluck('name')->toArray();

        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setRightToLeft(true);
        $sheet->setTitle('تحليل الأرباح الشامل');

        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $n !== null ? ($isWhole($n) ? number_format($n, 0) : number_format($n, 2)) : '—';

        $row = 1;
        $infoRows = [
            ['تحليل الأرباح الشامل', ''],
            ['من تاريخ',   $dateFrom ?? 'البداية'],
            ['إلى تاريخ',   $dateTo   ?? now()->format('Y-m-d')],
            ['المنتجات المشمولة في الحساب',    !empty($productNames) ? $productNames : 'الكل'],
            ['تاريخ الإنشاء', now()->format('Y-m-d H:i')],
            ['', ''],
            ['إجمالي صافي المبيعات', $fmtN(array_sum(array_column($data['monthly'], 'net_sales')))],
            ['إجمالي الربح', $fmtN($data['total_profit'])],
        ];
        
        foreach ($infoRows as $info) {
            $cells = is_array($info[1]) ? array_merge([$info[0]], $info[1]) : [$info[0], $info[1]];
            $sheet->fromArray($cells, null, 'A' . $row);
            $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($cells));
            $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
                'fill'    => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => 'EFF6FF']],
                'font'    => ['bold' => true, 'size' => 15],
                'borders' => ['allBorders' => ['borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN]],
            ]);
            $row++;
        }
        $row++;

        $headers = ['#', 'التاريخ', 'الشهر', 'المبيعات', 'المرتجعات', 'صافي المبيعات', 'الربح'];
        
        $lastCol = chr(ord('A') + count($headers) - 1);
        $sheet->fromArray($headers, null, 'A' . $row);
        $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
            'fill'      => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A5F']],
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 15],
            'borders'   => ['allBorders' => ['borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN]],
            'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER],
        ]);
        $row++;

        $i = 0;
        foreach ($data['monthly'] as $m) {
            foreach ($m['days'] as $d) {
                $bg = $i % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
                $rowData = [
                    $i + 1,
                    $d['date'],
                    $m['month'],
                    $fmtN($d['sales']),
                    $fmtN($d['returns']),
                    $fmtN($d['net_sales']),
                    $fmtN($d['profit'])
                ];

                $sheet->fromArray($rowData, null, 'A' . $row);
                $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
                    'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                    'borders' => ['allBorders' => ['borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN, 'color' => ['rgb' => 'E2E8F0']]],
                    'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER],
                ]);
                $row++;
                $i++;
            }
        }

        // Add Total Row
        $sheet->fromArray(['', '', 'الإجمالي', '', '', $fmtN(array_sum(array_column($data['monthly'], 'net_sales'))), $fmtN($data['total_profit'])], null, 'A' . $row);
        $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
            'fill'      => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F1F5F9']],
            'font'      => ['bold' => true, 'color' => ['rgb' => '1E293B']],
            'borders'   => ['allBorders' => ['borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN]],
            'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER],
        ]);

        foreach (range('A', $lastCol) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="profit-analysis-' . now()->format('Y-m-d') . '.xlsx"');
        header('Cache-Control: max-age=0');
        $writer->save('php://output');
        exit;
    }

}
