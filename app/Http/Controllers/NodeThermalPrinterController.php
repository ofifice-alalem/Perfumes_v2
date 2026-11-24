<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use App\Models\Invoice;
use App\Repositories\Contracts\SettingRepositoryInterface;
use App\Repositories\Contracts\InvoiceRepositoryInterface;

class NodeThermalPrinterController extends Controller
{
    protected SettingRepositoryInterface $settingRepo;
    protected InvoiceRepositoryInterface $invoiceRepo;

    public function __construct(
        SettingRepositoryInterface $settingRepo,
        InvoiceRepositoryInterface $invoiceRepo
    ) {
        $this->settingRepo = $settingRepo;
        $this->invoiceRepo = $invoiceRepo;
    }

    /**
     * Get printer bridge HTTP base URL
     */
    protected function getBridgeUrl(): string
    {
        $url = config('services.printer_bridge.url');
        if (!empty($url)) {
            return rtrim($url, '/');
        }

        // إذا كان التطبيق يعمل داخل حاوية دوكر، يتم توجيه الطلب تلقائياً للجهاز المضيف
        if (file_exists('/.dockerenv') || env('DOCKER_CONTAINER', false)) {
            return 'http://host.docker.internal:9124';
        }

        return 'http://127.0.0.1:9124';
    }

    /**
     * Check if printer bridge daemon is reachable via rapid socket probe
     */
    protected function isBridgeDaemonActive(): bool
    {
        $url = $this->getBridgeUrl();
        $parts = parse_url($url);
        $host = $parts['host'] ?? '127.0.0.1';
        $port = (int)($parts['port'] ?? 9124);

        $fp = @fsockopen($host, $port, $errno, $errstr, 0.08);
        if ($fp) {
            fclose($fp);
            return true;
        }

        return false;
    }

    /**
     * Get embedded thermal printer engine directory path
     */
    protected function getEnginePath(): string
    {
        return base_path('thermal-printer-engine');
    }

    /**
     * Build engine config data array with Base64 logo for zero-filesystem dependence
     */
    protected function buildEngineConfigPayload(): array
    {
        $storeName = $this->settingRepo->get('store_name', 'تاجوري للعطور الفاخرة');
        $storeSubname = $this->settingRepo->get('store_subname', '');
        $storeDetails = $this->settingRepo->get('store_details', "طرابلس - شارع الجرابة (مقابل مجمع الذهب)\nهاتف: 091-2345678 / 092-8765432");
        $thankYou = $this->settingRepo->get('thank_you_message', '✨ شكراً لزيارتكم! نتمنى لكم يوماً معطراً ✨');
        $policyNotes = $this->settingRepo->get('policy_notes', '');
        $printerName = $this->settingRepo->get('node_printer_name', 'XP-80');
        $showQrCode = $this->settingRepo->get('show_qr_code', '1') === '1';

        $storeLogoSetting = $this->settingRepo->get('store_logo') ?: '/images/logo-black_white.png';
        $logoFullPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, public_path(ltrim((string)$storeLogoSetting, '/\\')));
        if (!File::isFile($logoFullPath)) {
            $files = File::glob(public_path('images/receipt/logo_*.*'));
            if (!empty($files)) {
                usort($files, function($a, $b) {
                    return File::lastModified($b) - File::lastModified($a);
                });
                $logoFullPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $files[0]);
            } else {
                $logoFullPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, public_path('images/logo-black_white.png'));
            }
        }

        $logoBase64 = '';
        if (File::isFile($logoFullPath)) {
            $mime = File::mimeType($logoFullPath) ?: 'image/png';
            $logoBase64 = 'data:' . $mime . ';base64,' . base64_encode(File::get($logoFullPath));
        }

        return [
            'printer' => [
                'name' => $printerName,
                'paperWidthMm' => 80,
                'printableWidthDots' => 576,
                'feedLinesAfterPrint' => 0,
                'cutPaper' => true
            ],
            'labelPrinter' => [
                'name' => (string)($this->settingRepo->get('label_printer_name') ?: ''),
                'widthMm' => (float)$this->settingRepo->get('label_width_mm', 50),
                'heightMm' => (float)$this->settingRepo->get('label_height_mm', 25),
            ],
            'store' => [
                'name' => $storeName,
                'subname' => $storeSubname,
                'address' => $storeDetails,
                'phones' => '',
                'logoPath' => $logoFullPath,
                'logoBase64' => $logoBase64,
            ],
            'returnPolicy' => $policyNotes,
            'footerText' => $thankYou,
            'showQrCode' => $showQrCode
        ];
    }

    /**
     * Synchronize database settings to embedded engine config.json
     */
    public function syncEngineConfig()
    {
        try {
            $enginePath = $this->getEnginePath();
            $configFile = $enginePath . DIRECTORY_SEPARATOR . 'config.json';
            $configData = $this->buildEngineConfigPayload();

            $logoFullPath = $configData['store']['logoPath'] ?? '';
            $assetsDir = $enginePath . DIRECTORY_SEPARATOR . 'assets';
            if (!File::isDirectory($assetsDir)) {
                File::makeDirectory($assetsDir, 0755, true);
            }

            $ext = strrchr($logoFullPath, '.') ?: '.png';
            $engineLogoPath = $assetsDir . DIRECTORY_SEPARATOR . 'current_logo' . $ext;
            if (File::isFile($logoFullPath)) {
                @File::copy($logoFullPath, $engineLogoPath);
            }

            $configData['store']['logoPath'] = File::isFile($engineLogoPath) ? $engineLogoPath : $logoFullPath;

            // مزامنة الملفات مع جميع مسارات سيرفر الطباعة المعروفة (thermal-printer-engine و printer_bridge)
            $targetDirs = [
                $enginePath,
                base_path('printer_bridge'),
                'C:' . DIRECTORY_SEPARATOR . 'Users' . DIRECTORY_SEPARATOR . 'alhareth' . DIRECTORY_SEPARATOR . 'Desktop' . DIRECTORY_SEPARATOR . 'printer_bridge',
            ];

            foreach ($targetDirs as $targetDir) {
                if (File::isDirectory($targetDir)) {
                    $targetConfigFile = $targetDir . DIRECTORY_SEPARATOR . 'config.json';
                    $targetAssetsDir = $targetDir . DIRECTORY_SEPARATOR . 'assets';
                    if (!File::isDirectory($targetAssetsDir)) {
                        @File::makeDirectory($targetAssetsDir, 0755, true);
                    }
                    $targetEngineLogo = $targetAssetsDir . DIRECTORY_SEPARATOR . 'current_logo' . $ext;
                    if (File::exists($logoFullPath)) {
                        @File::copy($logoFullPath, $targetEngineLogo);
                    }

                    $dirConfigData = $configData;
                    $dirConfigData['store']['logoPath'] = File::exists($targetEngineLogo) ? $targetEngineLogo : $logoFullPath;
                    @File::put($targetConfigFile, json_encode($dirConfigData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                }
            }

            // إرسال الإعدادات الجديدة مباشرة إلى سيرفر الطباعة (المنفذ 9124)
            if ($this->isBridgeDaemonActive()) {
                try {
                    $bridgeUrl = $this->getBridgeUrl();
                    Http::connectTimeout(1.0)->timeout(3.0)->post("{$bridgeUrl}/config", [
                        'config' => $configData
                    ]);
                } catch (\Throwable $netErr) {
                    Log::warning("syncEngineConfig bridge HTTP update warning: " . $netErr->getMessage());
                }
            }
        } catch (\Throwable $e) {
            Log::error("NodeThermalPrinterController syncEngineConfig error: " . $e->getMessage());
        }
    }

    /**
     * Resolves label printer name dynamically from request or database settings
     */
    protected function resolveLabelPrinterName(?string $requestedName): string
    {
        $name = trim($requestedName ?: '');
        if (!empty($name)) {
            return $name;
        }

        return (string)($this->settingRepo->get('label_printer_name') ?: '');
    }

    /**
     * Get installed printers on Windows via embedded printer engine
     */
    public function getPrinters(Request $request)
    {
        try {
            $forceRefresh = $request->boolean('refresh', false);

            $printers = \Illuminate\Support\Facades\Cache::remember($forceRefresh ? 'installed_printers_' . time() : 'installed_printers', 86400, function () {
                $bridgeUrl = $this->getBridgeUrl();

                // 1. Try fetching printers directly from printer_bridge HTTP server
                try {
                    $response = Http::connectTimeout(1.0)->timeout(3.0)->get("{$bridgeUrl}/printers");
                    if ($response->successful()) {
                        $resData = $response->json();
                        if (!empty($resData['printers']) && is_array($resData['printers'])) {
                            return $resData['printers'];
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning("getPrinters HTTP query failed: " . $e->getMessage());
                }

                // 2. Fallback to local Windows detection if bridge HTTP is not reached
                $exePath = base_path('thermal-printer-engine' . DIRECTORY_SEPARATOR . 'bin' . DIRECTORY_SEPARATOR . 'list-printers.exe');
                if (file_exists($exePath)) {
                    $rawJson = shell_exec("\"$exePath\"");
                    if ($rawJson) {
                        $decoded = json_decode(trim($rawJson), true);
                        if (is_array($decoded) && !empty($decoded)) {
                            return $decoded;
                        }
                    }
                }

                $printersList = [];
                $psDirect = shell_exec('powershell -NoProfile -Command "Get-CimInstance Win32_Printer | ForEach-Object { [PSCustomObject]@{ Name = $_.Name; DriverName = $_.DriverName; PortName = $_.PortName; PrinterPaperNames = $_.PrinterPaperNames } } | ConvertTo-Json -Depth 3"');

                if ($psDirect) {
                    $decoded = json_decode($psDirect, true);
                    if (is_array($decoded)) {
                        if (isset($decoded['Name'])) {
                            $decoded = [$decoded];
                        }
                        foreach ($decoded as $p) {
                            $forms = [];
                            if (isset($p['PrinterPaperNames'])) {
                                $forms = is_array($p['PrinterPaperNames']) ? $p['PrinterPaperNames'] : [$p['PrinterPaperNames']];
                            }
                            $printersList[] = [
                                'name' => $p['Name'] ?? 'Unknown',
                                'driver' => $p['DriverName'] ?? '',
                                'port' => $p['PortName'] ?? '',
                                'status' => 'Ready',
                                'forms' => $forms,
                            ];
                        }
                    }
                }
                return $printersList;
            });

            $labelConfigured = (string)($this->settingRepo->get('label_printer_name') ?: '');

            return response()->json([
                'success' => true,
                'printers' => $printers,
                'configured' => $this->settingRepo->get('node_printer_name', 'XP-80'),
                'label_configured' => $labelConfigured
            ]);
        } catch (\Throwable $e) {
            Log::error("NodeThermalPrinterController getPrinters error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'تعذر كشف الطابعات: ' . $e->getMessage(),
                'printers' => []
            ], 500);
        }
    }

    /**
     * Formats Eloquent Invoice model into expected Node printer JSON structure
     */
    protected function formatInvoiceForEngine($invoiceId = null)
    {
        if (!$invoiceId) {
            return null;
        }

        $invoice = Invoice::with([
            'customer',
            'user',
            'items.product.originalPerfumeDetail',
            'items.size',
            'payments.paymentMethod',
            'settlements'
        ])
        ->where(function ($q) use ($invoiceId) {
            $q->where('id', $invoiceId)
              ->orWhere('invoice_number', (string)$invoiceId);
        })
        ->first();

        if (!$invoice) {
            return null;
        }

        $items = [];
        foreach ($invoice->items as $item) {
            $saleType = (string)($item->sale_type ?? '');
            $productName = $item->product ? $item->product->name : 'منتج';
            if ($item->size && !empty($item->size->label)) {
                $productName .= ' (' . $item->size->label . ')';
            }
            if ($saleType === 'full_bottle') {
                $productName .= ' (عبوة)';
            }

            $rawQty = (float)$item->quantity;
            if ($saleType === 'full_bottle') {
                $bottleVol = (float)($item->product?->originalPerfumeDetail?->bottle_volume ?? 0);
                $calcQty = ($bottleVol > 0) ? ($rawQty / $bottleVol) : ($rawQty > 0 ? $rawQty : 1);
            } elseif ($saleType === 'tier_decant' && $item->size && (float)$item->size->value > 0) {
                $calcQty = $rawQty / (float)$item->size->value;
            } else {
                $calcQty = $rawQty;
            }

            $items[] = [
                'name' => $productName,
                'quantity' => (floor($calcQty) == $calcQty) ? (int)$calcQty : (float)number_format($calcQty, 2),
                'price' => (float)$item->unit_price,
                'total' => (float)$item->line_total,
            ];
        }

        $payments = [];
        if ($invoice->payments && $invoice->payments->count() > 0) {
            foreach ($invoice->payments as $p) {
                $payments[] = [
                    'method' => $p->paymentMethod ? $p->paymentMethod->name : 'نقداً',
                    'amount' => (float)$p->amount,
                ];
            }
        } else {
            $payments[] = [
                'method' => 'نقداً',
                'amount' => (float)$invoice->paid_amount,
            ];
        }

        return [
            'invoiceNumber' => (string)($invoice->invoice_number ?? $invoice->id),
            'date' => $invoice->created_at ? $invoice->created_at->format('Y-m-d | h:i A') : date('Y-m-d | h:i A'),
            'dateTime' => $invoice->created_at ? $invoice->created_at->format('Y-m-d | h:i A') : date('Y-m-d | h:i A'),
            'cashier' => $invoice->user ? $invoice->user->name : 'كاشير',
            'customerName' => $invoice->customer ? $invoice->customer->name : 'زبون نقدي',
            'items' => $items,
            'total' => (float)$invoice->total,
            'paid' => (float)$invoice->paid_amount,
            'due' => (float)$invoice->due_amount,
            'payments' => $payments,
        ];
    }

    /**
     * Generate Preview image via embedded printer engine
     */
    public function generatePreview(Request $request)
    {
        try {
            $this->syncEngineConfig();
            $invoiceId = $request->input('invoice_id');
            $useMulti = $request->boolean('multi', true);
            $realInvoiceData = $this->formatInvoiceForEngine($invoiceId);

            // 1. Try fast HTTP preview via printer_bridge
            $bridgeUrl = $this->getBridgeUrl();
            try {
                $payload = [
                    'multi'  => $useMulti,
                    'config' => $this->buildEngineConfigPayload(),
                ];
                if ($realInvoiceData) {
                    $payload['invoice'] = $realInvoiceData;
                }

                $response = Http::connectTimeout(1.0)->timeout(3.5)->post("{$bridgeUrl}/preview", $payload);

                if ($response->successful()) {
                    $resData = $response->json();
                    if (!empty($resData['preview_src'])) {
                        return response()->json([
                            'success' => true,
                            'preview_src' => $resData['preview_src']
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("generatePreview printer_bridge connection failed: " . $e->getMessage());
            }

            return response()->json([
                'success' => false,
                'message' => 'تعذر توليد المعاينة: سيرفر الطباعة (printer_bridge) غير متصل.'
            ], 503);
        } catch (\Throwable $e) {
            Log::error("NodeThermalPrinterController generatePreview error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطأ في توليد المعاينة: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Executes CLI command with real invoice temporary JSON file
     */
    protected function executeCliWithInvoice(string $scriptName, ?array $realInvoiceData, bool $useMulti = true): string
    {
        $enginePath = $this->getEnginePath();
        $tempFile = null;
        $fileParam = '';

        if ($realInvoiceData) {
            $tempDir = $enginePath . DIRECTORY_SEPARATOR . 'temp';
            if (!File::isDirectory($tempDir)) {
                File::makeDirectory($tempDir, 0755, true);
            }
            $tempFile = $tempDir . DIRECTORY_SEPARATOR . 'cli_' . time() . '_' . uniqid() . '.json';
            File::put($tempFile, json_encode($realInvoiceData, JSON_UNESCAPED_UNICODE));
            $fileParam = sprintf('--file="%s"', $tempFile);
        } else {
            $fileParam = $useMulti ? '--multi' : '';
        }

        $cmd = sprintf('cd /d "%s" && node %s %s', $enginePath, $scriptName, $fileParam);
        $output = shell_exec("cmd /c \"$cmd\"");

        if ($tempFile && File::exists($tempFile)) {
            @File::delete($tempFile);
        }

        return (string)$output;
    }

    /**
     * Executes CLI command asynchronously in background without blocking PHP (< 5ms)
     */
    protected function executeCliAsync(string $scriptName, ?array $realInvoiceData, bool $useMulti = true): void
    {
        $enginePath = $this->getEnginePath();
        $tempFile = null;
        $fileParam = '';

        if ($realInvoiceData) {
            $tempDir = $enginePath . DIRECTORY_SEPARATOR . 'temp';
            if (!File::isDirectory($tempDir)) {
                File::makeDirectory($tempDir, 0755, true);
            }
            $tempFile = $tempDir . DIRECTORY_SEPARATOR . 'cli_' . time() . '_' . uniqid() . '.json';
            File::put($tempFile, json_encode($realInvoiceData, JSON_UNESCAPED_UNICODE));
            $fileParam = sprintf('--file="%s"', $tempFile);
        } else {
            $fileParam = $useMulti ? '--multi' : '';
        }

        $cmd = sprintf('cd /d "%s" && start /B node %s %s', $enginePath, $scriptName, $fileParam);
        @pclose(@popen($cmd, 'r'));
    }

    /**
     * Dispatch direct print job internally from PHP to Node daemon (Sub-10ms)
     */
    public function dispatchDirectPrint($invoiceId): bool
    {
        try {
            $this->syncEngineConfig();
            $realInvoiceData = $this->formatInvoiceForEngine($invoiceId);
            if (!$realInvoiceData) {
                return false;
            }

            // إذا كان سيرفر الطباعة غير شغال، لا يتم طباعة أي شيء
            if (!$this->isBridgeDaemonActive()) {
                Log::warning("dispatchDirectPrint: printer_bridge daemon is offline. Skipping print.");
                return false;
            }

            $payload = [
                'async'       => true,
                'multi'       => true,
                'printerName' => $this->settingRepo->get('node_printer_name', 'XP-80'),
                'invoice'     => $realInvoiceData,
                'config'      => $this->buildEngineConfigPayload(),
            ];

            $bridgeUrl = $this->getBridgeUrl();
            try {
                Http::timeout(1.0)->post("{$bridgeUrl}/print", $payload);
            } catch (\Throwable $e) {
                Log::warning("dispatchDirectPrint HTTP dispatch: " . $e->getMessage());
            }

            return true;
        } catch (\Throwable $e) {
            Log::error("dispatchDirectPrint error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send direct print RAW job via embedded printer engine
     */
    public function printDirect(Request $request)
    {
        try {
            $this->syncEngineConfig();
            $invoiceId = $request->input('invoice_id');
            $useMulti = $request->boolean('multi', true);
            $isDemo = $request->boolean('demo', false);

            $realInvoiceData = null;

            if ($invoiceId) {
                $realInvoiceData = $this->formatInvoiceForEngine($invoiceId);
                if (!$realInvoiceData) {
                    return response()->json([
                        'success' => false,
                        'message' => "تعذر العثور على الفاتورة رقم ($invoiceId) في قاعدة البيانات"
                    ], 404);
                }
            } else if (!$isDemo) {
                return response()->json([
                    'success' => false,
                    'message' => 'يرجى تحديد رقم الفاتورة للطباعة'
                ], 400);
            }

            // التحقق من أن سيرفر الطباعة يعمل
            if (!$this->isBridgeDaemonActive()) {
                return response()->json([
                    'success' => false,
                    'message' => 'سيرفر الطباعة (printer_bridge) غير متصل، تم إلغاء الطباعة.'
                ], 503);
            }

            $bridgeUrl = $this->getBridgeUrl();
            $payload = [
                'multi'       => $useMulti,
                'printerName' => $this->settingRepo->get('node_printer_name', 'XP-80'),
                'config'      => $this->buildEngineConfigPayload(),
            ];
            if ($realInvoiceData) {
                $payload['invoice'] = $realInvoiceData;
            }

            $response = Http::connectTimeout(1.0)->timeout(2.5)->post("{$bridgeUrl}/print", $payload);
            if ($response->successful()) {
                $resData = $response->json();
                return response()->json([
                    'success' => true,
                    'message' => 'تم إرسال الفاتورة بنجاح وبسرعة فائقة (' . ($resData['durationMs'] ?? '40') . 'ms)',
                    'log' => $resData['message'] ?? 'Fast Print Server'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'فشل إرسال أمر الطباعة إلى سيرفر printer_bridge'
            ], 500);
        } catch (\Throwable $e) {
            Log::error("NodeThermalPrinterController printDirect error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء الطباعة المباشرة: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send direct print RAW job for Barcode/QR labels via Node engine
     */
    public function printLabelDirect(Request $request)
    {
        try {
            $printerName = $this->resolveLabelPrinterName($request->input('printer_name'));
            if (empty($printerName)) {
                return response()->json([
                    'success' => false,
                    'message' => 'يرجى تحديد طابعة الملصقات أولاً من القائمة'
                ], 400);
            }

            $labelData = [
                'widthMm'      => (float)($request->input('width_mm') ?: $this->settingRepo->get('label_width_mm', 50)),
                'heightMm'     => (float)($request->input('height_mm') ?: $this->settingRepo->get('label_height_mm', 25)),
                'rotation'     => (int)($request->input('rotation') ?? $this->settingRepo->get('label_rotation', 0)),
                'offsetX'      => (float)($request->input('offset_x') ?? 0),
                'offsetY'      => (float)($request->input('offset_y') ?? 0),
                'tab'          => $request->input('tab', 'ean13'),
                'productName'  => $request->input('product_name', 'عطر تجريبي فاخر'),
                'price'        => $request->input('price', ''),
                'code'         => $request->input('code', '240000669027'),
                'showName'     => $request->boolean('show_name', true),
                'showPrice'    => $request->boolean('show_price', true),
                'showCodeText' => $request->boolean('show_code_text', true),
                'qrSize'       => (float)($request->input('qr_size') ?: $this->settingRepo->get('label_qr_size', 0)),
                'titleFontSize'=> (float)($request->input('title_font_size') ?: $this->settingRepo->get('label_title_font_size', 0)),
                'copies'       => max(1, (int)$request->input('copies', 1)),
                'protocol'     => $request->input('protocol', 'tspl'),
                'printerName'  => $printerName,
            ];

            // 1. Fast probe to check printer bridge
            if (!$this->isBridgeDaemonActive()) {
                return response()->json([
                    'success' => false,
                    'message' => 'سيرفر الطباعة (printer_bridge) غير متصل، تم إلغاء طباعة الملصق.'
                ], 503);
            }

            $bridgeUrl = $this->getBridgeUrl();

            try {
                $response = Http::connectTimeout(1.5)->timeout(8.0)->post("{$bridgeUrl}/print-label", [
                    'printerName' => $printerName,
                    'label'       => $labelData,
                ]);
                if ($response->successful()) {
                    $resData = $response->json();
                    return response()->json([
                        'success'     => true,
                        'message'     => 'تم إرسال ملصق الباركود بنجاح إلى الطابعة ' . ($resData['printerUsed'] ?? $printerName),
                        'printerUsed' => $resData['printerUsed'] ?? $printerName,
                        'durationMs'  => $resData['durationMs'] ?? null,
                    ]);
                }
            } catch (\Throwable $e) {
                Log::warning("printLabelDirect HTTP dispatch: " . $e->getMessage());
                if (str_contains($e->getMessage(), 'timed out') || str_contains($e->getMessage(), 'cURL error 28')) {
                    return response()->json([
                        'success'     => true,
                        'message'     => 'تم إرسال ملصق الباركود إلى الطابعة ' . $printerName,
                        'printerUsed' => $printerName,
                    ]);
                }
            }

            return response()->json([
                'success' => false,
                'message' => 'تعذر إرسال أمر طباعة الملصق إلى سيرفر الطباعة.'
            ], 500);
        } catch (\Throwable $e) {
            Log::error("NodeThermalPrinterController printLabelDirect error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء طباعة الملصق: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Send direct batch print RAW job for multiple Barcode/QR labels via Node engine
     */
    public function printBatchLabelsDirect(Request $request)
    {
        try {
            $printerName = $this->resolveLabelPrinterName($request->input('printer_name'));
            if (empty($printerName)) {
                return response()->json([
                    'success' => false,
                    'message' => 'يرجى تحديد طابعة الملصقات أولاً من القائمة'
                ], 400);
            }

            $items = $request->input('items', []);
            if (empty($items) || !is_array($items)) {
                return response()->json([
                    'success' => false,
                    'message' => 'لم يتم توفير قائمة المنتجات للطباعة الجماعية'
                ], 400);
            }

            $widthMm       = (float)($request->input('width_mm') ?: $this->settingRepo->get('label_width_mm', 50));
            $heightMm      = (float)($request->input('height_mm') ?: $this->settingRepo->get('label_height_mm', 25));
            $rotation      = (int)($request->input('rotation') ?? $this->settingRepo->get('label_rotation', 0));
            $offsetX       = (float)($request->input('offset_x') ?? 0);
            $offsetY       = (float)($request->input('offset_y') ?? 0);
            $tab           = $request->input('tab', 'ean13');
            $showName      = $request->boolean('show_name', true);
            $showPrice     = $request->boolean('show_price', true);
            $showCodeText  = $request->boolean('show_code_text', true);
            $qrSize        = (float)($request->input('qr_size') ?: $this->settingRepo->get('label_qr_size', 0));
            $titleFontSize = (float)($request->input('title_font_size') ?: $this->settingRepo->get('label_title_font_size', 0));
            $copies        = max(1, (int)$request->input('copies', 1));
            $protocol      = $request->input('protocol', 'tspl');

            $labels = [];
            foreach ($items as $item) {
                $labels[] = [
                    'widthMm'       => $widthMm,
                    'heightMm'      => $heightMm,
                    'rotation'      => $rotation,
                    'offsetX'       => $offsetX,
                    'offsetY'       => $offsetY,
                    'tab'           => $tab,
                    'productName'   => $item['product_name'] ?? 'منتج',
                    'price'         => $item['price'] ?? '',
                    'code'          => (string)($item['code'] ?? '0000000000'),
                    'showName'      => $showName,
                    'showPrice'     => $showPrice,
                    'showCodeText'  => $showCodeText,
                    'qrSize'        => $qrSize,
                    'titleFontSize' => $titleFontSize,
                    'copies'        => $copies,
                    'protocol'      => $protocol,
                    'printerName'   => $printerName,
                ];
            }

            // 1. Fast probe to check printer bridge
            if (!$this->isBridgeDaemonActive()) {
                return response()->json([
                    'success' => false,
                    'message' => 'سيرفر الطباعة (printer_bridge) غير متصل، تم إلغاء الطباعة الجماعية.'
                ], 503);
            }

            $bridgeUrl = $this->getBridgeUrl();

            try {
                $response = Http::connectTimeout(2.0)->timeout(15.0)->post("{$bridgeUrl}/print-batch-labels", [
                    'printerName' => $printerName,
                    'labels'      => $labels,
                ]);
                if ($response->successful()) {
                    $resData = $response->json();
                    return response()->json([
                        'success'     => true,
                        'message'     => 'تم إرسال ' . count($labels) . ' ملصق بنجاح إلى الطابعة ' . ($resData['printerUsed'] ?? $printerName),
                        'printerUsed' => $resData['printerUsed'] ?? $printerName,
                        'durationMs'  => $resData['durationMs'] ?? null,
                        'count'       => count($labels),
                    ]);
                }
            } catch (\Throwable $e) {
                Log::warning("printBatchLabelsDirect HTTP dispatch: " . $e->getMessage());
                if (str_contains($e->getMessage(), 'timed out') || str_contains($e->getMessage(), 'cURL error 28')) {
                    return response()->json([
                        'success'     => true,
                        'message'     => 'تم إرسال ' . count($labels) . ' ملصق إلى الطابعة ' . $printerName,
                        'printerUsed' => $printerName,
                        'count'       => count($labels),
                    ]);
                }
            }

            return response()->json([
                'success' => false,
                'message' => 'تعذر إرسال أمر الطباعة الجماعية إلى سيرفر الطباعة.'
            ], 500);
        } catch (\Throwable $e) {
            Log::error("NodeThermalPrinterController printBatchLabelsDirect error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء الطباعة الجماعية: ' . $e->getMessage(),
            ], 500);
        }
    }
}

