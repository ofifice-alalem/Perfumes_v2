<?php

namespace App\Repositories;

use App\Models\OriginalPerfumeDetail;
use App\Models\ProductPrice;
use App\Repositories\Contracts\ProductRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Prettus\Repository\Eloquent\Repository;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ProductRepository extends Repository implements ProductRepositoryInterface
{
    public function allWithRelations(array $filters = [])
    {
        return QueryBuilder::for($this->model->with(['category', 'priceTier', 'productPrice', 'originalPerfumeDetail']))
            ->allowedFilters(
                AllowedFilter::exact('category_id'),
                AllowedFilter::exact('selling_type'),
                AllowedFilter::exact('price_tier_id'),
                AllowedFilter::callback('low_stock', fn($q) => $q->whereColumn('stock', '<=', 'min_stock')),
                AllowedFilter::partial('name'),
            )
            ->allowedSorts('name', 'stock', 'created_at')
            ->defaultSort('name')
            ->get();
    }

    public function findWithRelations(int $id)
    {
        return $this->model
            ->with(['category', 'priceTier', 'productPrice', 'originalPerfumeDetail'])
            ->findOrFail($id);
    }

    public function createWithRelations(array $data)
    {
        return DB::transaction(function () use ($data) {
            $product = $this->create([
                'name'          => $data['name'],
                'qrcode'        => $data['qrcode'] ?? null,
                'category_id'   => $data['category_id'],
                'price_tier_id' => $data['price_tier_id'] ?? null,
                'selling_type'  => $data['selling_type'],
                'min_stock'     => $data['min_stock'] ?? 0,
            ]);

            if ($data['selling_type'] === 'unit_priced') {
                $category = \App\Models\Category::find($data['category_id']);

                if (!$category->is_operational) {
                    ProductPrice::create([
                        'product_id'             => $product->id,
                        'price_per_unit_regular' => $data['price_per_unit_regular'],
                        'price_per_unit_vip'     => $data['price_per_unit_vip'],
                        'full_bottle_regular'    => $data['full_bottle_regular'] ?? null,
                        'full_bottle_vip'        => $data['full_bottle_vip'] ?? null,
                    ]);

                    if (!empty($data['bottle_volume'])) {
                        OriginalPerfumeDetail::create([
                            'product_id'    => $product->id,
                            'bottle_volume' => $data['bottle_volume'],
                        ]);
                    }
                }
            }

            return $product->load(['category', 'priceTier', 'productPrice', 'originalPerfumeDetail']);
        });
    }

    public function updateWithRelations(int $id, array $data)
    {
        return DB::transaction(function () use ($id, $data) {
            $product = $this->find($id);

            $this->update([
                'name'          => $data['name'],
                'qrcode'        => $data['qrcode'] ?? null,
                'category_id'   => $data['category_id'],
                'price_tier_id' => $data['price_tier_id'] ?? null,
                'selling_type'  => $data['selling_type'],
                'min_stock'     => $data['min_stock'] ?? 0,
            ], $id);

            if ($data['selling_type'] === 'unit_priced') {
                $category = \App\Models\Category::find($data['category_id']);

                if (!$category->is_operational) {
                    ProductPrice::updateOrCreate(
                        ['product_id' => $product->id],
                        [
                            'price_per_unit_regular' => $data['price_per_unit_regular'],
                            'price_per_unit_vip'     => $data['price_per_unit_vip'],
                            'full_bottle_regular'    => $data['full_bottle_regular'] ?? null,
                            'full_bottle_vip'        => $data['full_bottle_vip'] ?? null,
                        ]
                    );

                    if (!empty($data['bottle_volume'])) {
                        OriginalPerfumeDetail::updateOrCreate(
                            ['product_id' => $product->id],
                            ['bottle_volume' => $data['bottle_volume']]
                        );
                    } else {
                        OriginalPerfumeDetail::where('product_id', $product->id)->delete();
                    }
                } else {
                    ProductPrice::where('product_id', $product->id)->delete();
                    OriginalPerfumeDetail::where('product_id', $product->id)->delete();
                }
            } else {
                ProductPrice::where('product_id', $product->id)->delete();
                OriginalPerfumeDetail::where('product_id', $product->id)->delete();
            }

            return $product->fresh(['category', 'priceTier', 'productPrice', 'originalPerfumeDetail']);
        });
    }

    public function isUsed(int $id): bool
    {
        $product = $this->find($id);
        return $product->invoiceItems()->exists() || $product->purchaseItems()->exists();
    }

    public function exportCatalogExcel(): void
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Tajawal')->setSize(12);

        $headerStyle = [
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E3A5F'],
            ],
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 13,
            ],
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ];

        $dataRowStyle = fn($bg) => [
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => $bg],
            ],
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E2E8F0']],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ];

        // ═════════════════════════════════════════════════════════════════
        // الورقة 1: المنتجات
        // ═════════════════════════════════════════════════════════════════
        $sheetProducts = $spreadsheet->getActiveSheet();
        $sheetProducts->setTitle('المنتجات');
        $sheetProducts->setRightToLeft(true);

        $prodHeaders = [
            '#',
            'اسم المنتج',
            'التصنيف',
            'نوع البيع',
            'التير (لحساب الحجم)',
            'الباركود / QR',
            'المخزون الحالي',
            'حد التنبيه (الأدنى)',
            'سعر الوحدة عادي',
            'سعر الوحدة VIP',
            'سعر العبوة كاملة عادي',
            'سعر العبوة كاملة VIP',
            'حجم القنينة (مل)',
        ];

        $sheetProducts->fromArray($prodHeaders, null, 'A1');
        $lastColProd = chr(ord('A') + count($prodHeaders) - 1);
        $sheetProducts->getStyle('A1:' . $lastColProd . '1')->applyFromArray($headerStyle);
        $sheetProducts->getRowDimension(1)->setRowHeight(28);

        $products = $this->model->with(['category', 'priceTier', 'productPrice', 'originalPerfumeDetail'])->orderBy('name')->get();

        $rowIdx = 2;
        foreach ($products as $i => $p) {
            $bg = $i % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
            $sellingTypeLabel = $p->selling_type === 'unit_priced' ? 'سعر الوحدة' : 'حسب الحجم والتير';
            
            $rowData = [
                $i + 1,
                $p->name,
                $p->category?->name ?? '',
                $sellingTypeLabel,
                $p->priceTier?->name ?? '',
                $p->qrcode ?? '',
                (float)$p->stock,
                (float)$p->min_stock,
                $p->productPrice ? (float)$p->productPrice->price_per_unit_regular : '',
                $p->productPrice ? (float)$p->productPrice->price_per_unit_vip : '',
                $p->productPrice && $p->productPrice->full_bottle_regular !== null ? (float)$p->productPrice->full_bottle_regular : '',
                $p->productPrice && $p->productPrice->full_bottle_vip !== null ? (float)$p->productPrice->full_bottle_vip : '',
                $p->originalPerfumeDetail ? (float)$p->originalPerfumeDetail->bottle_volume : '',
            ];

            $sheetProducts->fromArray($rowData, null, 'A' . $rowIdx);
            $sheetProducts->getStyle('A' . $rowIdx . ':' . $lastColProd . $rowIdx)->applyFromArray($dataRowStyle($bg));
            $sheetProducts->getRowDimension($rowIdx)->setRowHeight(22);
            $rowIdx++;
        }

        foreach (range('A', $lastColProd) as $c) {
            $sheetProducts->getColumnDimension($c)->setAutoSize(true);
        }

        // ═════════════════════════════════════════════════════════════════
        // الورقة 2: التصنيفات
        // ═════════════════════════════════════════════════════════════════
        $sheetCats = $spreadsheet->createSheet();
        $sheetCats->setTitle('التصنيفات');
        $sheetCats->setRightToLeft(true);

        $catHeaders = ['#', 'اسم التصنيف', 'وحدة القياس', 'منتج تشغيلي؟'];
        $lastColCat = chr(ord('A') + count($catHeaders) - 1);
        $sheetCats->fromArray($catHeaders, null, 'A1');
        $sheetCats->getStyle('A1:' . $lastColCat . '1')->applyFromArray($headerStyle);
        $sheetCats->getRowDimension(1)->setRowHeight(28);

        $categories = \App\Models\Category::orderBy('id')->get();
        $rowIdx = 2;
        foreach ($categories as $i => $cat) {
            $bg = $i % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
            $rowData = [
                $i + 1,
                $cat->name,
                $cat->unit,
                $cat->is_operational ? 'نعم' : 'لا',
            ];
            $sheetCats->fromArray($rowData, null, 'A' . $rowIdx);
            $sheetCats->getStyle('A' . $rowIdx . ':' . $lastColCat . $rowIdx)->applyFromArray($dataRowStyle($bg));
            $sheetCats->getRowDimension($rowIdx)->setRowHeight(22);
            $rowIdx++;
        }
        foreach (range('A', $lastColCat) as $c) {
            $sheetCats->getColumnDimension($c)->setAutoSize(true);
        }

        // ═════════════════════════════════════════════════════════════════
        // الورقة 3: الأحجام
        // ═════════════════════════════════════════════════════════════════
        $sheetSizes = $spreadsheet->createSheet();
        $sheetSizes->setTitle('الأحجام');
        $sheetSizes->setRightToLeft(true);

        $sizeHeaders = ['#', 'اسم الحجم', 'القيمة الرقمية', 'الوحدة'];
        $lastColSize = chr(ord('A') + count($sizeHeaders) - 1);
        $sheetSizes->fromArray($sizeHeaders, null, 'A1');
        $sheetSizes->getStyle('A1:' . $lastColSize . '1')->applyFromArray($headerStyle);
        $sheetSizes->getRowDimension(1)->setRowHeight(28);

        $sizes = \App\Models\Size::orderBy('value')->get();
        $rowIdx = 2;
        foreach ($sizes as $i => $size) {
            $bg = $i % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
            $rowData = [
                $i + 1,
                $size->label,
                (float)$size->value,
                $size->unit,
            ];
            $sheetSizes->fromArray($rowData, null, 'A' . $rowIdx);
            $sheetSizes->getStyle('A' . $rowIdx . ':' . $lastColSize . $rowIdx)->applyFromArray($dataRowStyle($bg));
            $sheetSizes->getRowDimension($rowIdx)->setRowHeight(22);
            $rowIdx++;
        }
        foreach (range('A', $lastColSize) as $c) {
            $sheetSizes->getColumnDimension($c)->setAutoSize(true);
        }

        // ═════════════════════════════════════════════════════════════════
        // الورقة 4: التيرات والأسعار (جداول منفصلة لكل تير تشمل جميع الأحجام)
        // ═════════════════════════════════════════════════════════════════
        $sheetTiers = $spreadsheet->createSheet();
        $sheetTiers->setTitle('التيرات والأسعار');
        $sheetTiers->setRightToLeft(true);

        $tierBannerStyle = [
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '0F172A'], // كحلي داكن فاخر
            ],
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'F8FAFC'],
                'size' => 13,
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '334155']],
            ],
        ];

        $subHeaderStyle = [
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E3A5F'],
            ],
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 12,
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '94A3B8']],
            ],
        ];

        $tiers = \App\Models\PriceTier::with('tierPrices.size')->orderBy('name')->get();
        $allSizes = \App\Models\Size::orderBy('value')->get();

        $tierCols = ['#', 'اسم التير', 'الوصف', 'اسم الحجم', 'السعر العادي', 'سعر VIP'];
        $lastColTier = chr(ord('A') + count($tierCols) - 1); // F

        $rowIdx = 1;

        foreach ($tiers as $tier) {
            // خريطة أسعار التير الحالية حسب size_id
            $priceMap = [];
            foreach ($tier->tierPrices as $tp) {
                $priceMap[$tp->size_id] = $tp;
            }

            // 1. عنوان / بانر التير المدمج
            $sheetTiers->mergeCells("A{$rowIdx}:{$lastColTier}{$rowIdx}");
            $sheetTiers->setCellValue("A{$rowIdx}", "جدول أسعار تير: " . $tier->name . ($tier->description ? " (" . $tier->description . ")" : ''));
            $sheetTiers->getStyle("A{$rowIdx}:{$lastColTier}{$rowIdx}")->applyFromArray($tierBannerStyle);
            $sheetTiers->getRowDimension($rowIdx)->setRowHeight(30);
            $rowIdx++;

            // 2. رؤوس أعمدة جدول هذا التير
            $sheetTiers->fromArray($tierCols, null, "A{$rowIdx}");
            $sheetTiers->getStyle("A{$rowIdx}:{$lastColTier}{$rowIdx}")->applyFromArray($subHeaderStyle);
            $sheetTiers->getRowDimension($rowIdx)->setRowHeight(26);
            $rowIdx++;

            // 3. صفوف كل الأحجام المسجلة في المنظومة
            foreach ($allSizes as $sIdx => $size) {
                $bg = $sIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
                $existingPrice = $priceMap[$size->id] ?? null;

                $regVal = ($existingPrice && $existingPrice->price_regular !== null) ? (float)$existingPrice->price_regular : '';
                $vipVal = ($existingPrice && $existingPrice->price_vip !== null) ? (float)$existingPrice->price_vip : '';

                $rowData = [
                    $sIdx + 1,
                    $tier->name,
                    $tier->description ?? '',
                    $size->label,
                    $regVal,
                    $vipVal,
                ];

                $sheetTiers->fromArray($rowData, null, "A{$rowIdx}");
                $sheetTiers->getStyle("A{$rowIdx}:{$lastColTier}{$rowIdx}")->applyFromArray($dataRowStyle($bg));
                $sheetTiers->getRowDimension($rowIdx)->setRowHeight(22);
                $rowIdx++;
            }

            // سطر فارغ فاصل بين جداول التيرات لتسهيل القراءة والتنظيم
            $rowIdx++;
        }

        foreach (range('A', $lastColTier) as $c) {
            $sheetTiers->getColumnDimension($c)->setAutoSize(true);
        }

        // Set active sheet to Products
        $spreadsheet->setActiveSheetIndex(0);

        $filename = 'perfumes-catalog-' . now()->format('Y-m-d') . '.xlsx';
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');
        (new Xlsx($spreadsheet))->save('php://output');
        exit;
    }

    public function importCatalogExcel(\Illuminate\Http\UploadedFile $file): array
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(300);

        $spreadsheet = IOFactory::load($file->getRealPath());

        return DB::transaction(function () use ($spreadsheet) {
            $stats = [
                'categories' => 0,
                'sizes'      => 0,
                'tiers'      => 0,
                'tier_prices'=> 0,
                'products'   => 0,
            ];

            // 1. استيراد التصنيفات إذا كانت الورقة موجودة
            $catSheet = $spreadsheet->getSheetByName('التصنيفات');
            if ($catSheet) {
                $rows = $catSheet->toArray();
                for ($i = 1; $i < count($rows); $i++) {
                    $row = $rows[$i];
                    $name = trim($row[1] ?? '');
                    if (empty($name)) continue;

                    $rawUnit = strtolower(trim($row[2] ?? 'ml'));
                    $unit = in_array($rawUnit, ['ml', 'pcs', 'g']) ? $rawUnit : (str_contains($rawUnit, 'قطعة') ? 'pcs' : (str_contains($rawUnit, 'غرام') ? 'g' : 'ml'));
                    $rawOp = trim($row[3] ?? 'لا');
                    $isOp = in_array($rawOp, ['نعم', 'true', '1', 'yes']);

                    \App\Models\Category::updateOrCreate(
                        ['name' => $name],
                        ['unit' => $unit, 'is_operational' => $isOp]
                    );
                    $stats['categories']++;
                }
            }

            // 2. استيراد الأحجام إذا كانت الورقة موجودة
            $sizeSheet = $spreadsheet->getSheetByName('الأحجام');
            if ($sizeSheet) {
                $rows = $sizeSheet->toArray();
                for ($i = 1; $i < count($rows); $i++) {
                    $row = $rows[$i];
                    $label = trim($row[1] ?? '');
                    if (empty($label)) continue;

                    $val = (float)($row[2] ?? 0);
                    $rawUnit = strtolower(trim($row[3] ?? 'ml'));
                    $unit = in_array($rawUnit, ['ml', 'pcs', 'g']) ? $rawUnit : 'ml';

                    \App\Models\Size::updateOrCreate(
                        ['label' => $label],
                        ['value' => $val > 0 ? $val : 1, 'unit' => $unit]
                    );
                    $stats['sizes']++;
                }
            }

            // 3. استيراد التيرات والأسعار إذا كانت الورقة موجودة (يدعم الجداول المنفصلة أو الجدول الموحد)
            $tierSheet = $spreadsheet->getSheetByName('التيرات والأسعار');
            if ($tierSheet) {
                $rows = $tierSheet->toArray();
                for ($i = 0; $i < count($rows); $i++) {
                    $row = $rows[$i];
                    $tierName = trim($row[1] ?? '');

                    // تجاهل الأسطر الفارغة، وأسطر العناوين الرئيسية أو عناوين الأعمدة
                    if (empty($tierName) || $tierName === 'اسم التير' || str_starts_with($tierName, 'جدول أسعار تير')) {
                        continue;
                    }

                    $desc = trim($row[2] ?? '');
                    $sizeLabel = trim($row[3] ?? '');
                    $hasReg = isset($row[4]) && trim((string)$row[4]) !== '';
                    $hasVip = isset($row[5]) && trim((string)$row[5]) !== '';
                    $regPrice = $hasReg ? (float)$row[4] : null;
                    $vipPrice = $hasVip ? (float)$row[5] : null;

                    $tier = \App\Models\PriceTier::updateOrCreate(
                        ['name' => $tierName],
                        ['description' => $desc ?: null]
                    );
                    $stats['tiers']++;

                    // الحجم الذي له سعر (عادي أو VIP) يتم تسجيله، وما عدا ذلك يترك فارغاً بدون سعر
                    if (!empty($sizeLabel) && ($regPrice !== null || $vipPrice !== null)) {
                        $size = \App\Models\Size::where('label', $sizeLabel)->first();
                        if ($size) {
                            \App\Models\TierPrice::updateOrCreate(
                                ['tier_id' => $tier->id, 'size_id' => $size->id],
                                [
                                    'price_regular' => $regPrice ?? 0,
                                    'price_vip'     => $vipPrice ?? 0,
                                ]
                            );
                            $stats['tier_prices']++;
                        }
                    }
                }
            }

            // 4. استيراد المنتجات (Sheet 'المنتجات' أو الورقة الأولى)
            $prodSheet = $spreadsheet->getSheetByName('المنتجات') ?: $spreadsheet->getSheet(0);
            if ($prodSheet) {
                $rows = $prodSheet->toArray();
                for ($i = 1; $i < count($rows); $i++) {
                    $row = $rows[$i];
                    $name = trim($row[1] ?? '');
                    if (empty($name)) continue;

                    $catName = trim($row[2] ?? '');
                    $sellingTypeStr = trim($row[3] ?? '');
                    $tierName = trim($row[4] ?? '');
                    $qrcode = trim($row[5] ?? '') ?: null;
                    $stock = isset($row[6]) && $row[6] !== '' ? (float)$row[6] : 0;
                    $minStock = isset($row[7]) && $row[7] !== '' ? (float)$row[7] : 0;

                    $priceReg = isset($row[8]) && $row[8] !== '' ? (float)$row[8] : 0;
                    $priceVip = isset($row[9]) && $row[9] !== '' ? (float)$row[9] : 0;
                    $fullBottleReg = isset($row[10]) && $row[10] !== '' ? (float)$row[10] : null;
                    $fullBottleVip = isset($row[11]) && $row[11] !== '' ? (float)$row[11] : null;
                    $bottleVolume = isset($row[12]) && $row[12] !== '' ? (float)$row[12] : null;

                    // Resolve Category
                    $category = null;
                    if (!empty($catName)) {
                        $category = \App\Models\Category::where('name', $catName)->first();
                        if (!$category) {
                            $category = \App\Models\Category::create([
                                'name' => $catName,
                                'unit' => 'ml',
                                'is_operational' => false,
                            ]);
                            $stats['categories']++;
                        }
                    } else {
                        $category = \App\Models\Category::first();
                    }

                    // Resolve Selling Type
                    $sellingType = 'unit_priced';
                    if (str_contains($sellingTypeStr, 'حجم') || str_contains($sellingTypeStr, 'تير') || $sellingTypeStr === 'size_based' || (!empty($tierName) && $category && str_contains($category->name, 'زيت'))) {
                        $sellingType = 'size_based';
                    }

                    // Resolve Price Tier
                    $tierId = null;
                    if ($sellingType === 'size_based' && !empty($tierName)) {
                        $tier = \App\Models\PriceTier::where('name', $tierName)->first();
                        if (!$tier) {
                            $tier = \App\Models\PriceTier::create(['name' => $tierName]);
                            $stats['tiers']++;
                        }
                        $tierId = $tier->id;
                    }

                    // Check if product exists by name
                    $product = \App\Models\Product::where('name', $name)->first();

                    $productData = [
                        'name'          => $name,
                        'qrcode'        => $qrcode,
                        'category_id'   => $category->id,
                        'price_tier_id' => $tierId,
                        'selling_type'  => $sellingType,
                        'stock'         => $stock,
                        'min_stock'     => $minStock,
                    ];

                    if ($product) {
                        $product->update($productData);
                    } else {
                        $product = \App\Models\Product::create($productData);
                    }

                    // Handle Unit Priced Product Details
                    if ($sellingType === 'unit_priced' && !$category->is_operational) {
                        \App\Models\ProductPrice::updateOrCreate(
                            ['product_id' => $product->id],
                            [
                                'price_per_unit_regular' => $priceReg,
                                'price_per_unit_vip'     => $priceVip,
                                'full_bottle_regular'    => $fullBottleReg,
                                'full_bottle_vip'        => $fullBottleVip,
                            ]
                        );

                        if ($bottleVolume !== null && $bottleVolume > 0) {
                            \App\Models\OriginalPerfumeDetail::updateOrCreate(
                                ['product_id' => $product->id],
                                ['bottle_volume' => $bottleVolume]
                            );
                        }
                    }

                    $stats['products']++;
                }
            }

            return $stats;
        });
    }
}
