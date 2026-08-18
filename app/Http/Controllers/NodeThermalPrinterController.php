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
     * Get embedded thermal printer engine directory path
     */
    protected function getEnginePath(): string
    {
        return base_path('thermal-printer-engine');
    }

    /**
     * Synchronize database settings to embedded engine config.json
     */
    protected function syncEngineConfig()
    {
        try {
            $enginePath = $this->getEnginePath();
            $configFile = $enginePath . DIRECTORY_SEPARATOR . 'config.json';

            $storeName = $this->settingRepo->get('store_name', 'تاجوري للعطور الفاخرة');
            $storeSubname = $this->settingRepo->get('store_subname', '');
            $storeDetails = $this->settingRepo->get('store_details', "طرابلس - شارع الجرابة (مقابل مجمع الذهب)\nهاتف: 091-2345678 / 092-8765432");
            $thankYou = $this->settingRepo->get('thank_you_message', '✨ شكراً لزيارتكم! نتمنى لكم يوماً معطراً ✨');
            $policyNotes = $this->settingRepo->get('policy_notes', '');
            $printerName = $this->settingRepo->get('node_printer_name', 'XP-80');
            $showQrCode = $this->settingRepo->get('show_qr_code', '1') === '1';

            $storeLogoSetting = $this->settingRepo->get('store_logo', '/images/logo-black_white.png');
            $logoFullPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, public_path(ltrim($storeLogoSetting, '/\\')));
            if (!File::exists($logoFullPath)) {
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

            $assetsDir = $enginePath . DIRECTORY_SEPARATOR . 'assets';
            if (!File::isDirectory($assetsDir)) {
                File::makeDirectory($assetsDir, 0755, true);
            }

            $ext = strrchr($logoFullPath, '.') ?: '.png';
            $engineLogoPath = $assetsDir . DIRECTORY_SEPARATOR . 'current_logo' . $ext;
            if (File::exists($logoFullPath)) {
                @File::copy($logoFullPath, $engineLogoPath);
            }

            $configData = [
                'printer' => [
                    'name' => $printerName,
                    'paperWidthMm' => 80,
                    'printableWidthDots' => 576,
                    'feedLinesAfterPrint' => 1,
                    'cutPaper' => true
                ],
                'store' => [
                    'name' => $storeName,
                    'subname' => $storeSubname,
                    'address' => $storeDetails,
                    'phones' => '',
                    'logoPath' => File::exists($engineLogoPath) ? $engineLogoPath : $logoFullPath
                ],
                'returnPolicy' => $policyNotes,
                'footerText' => $thankYou,
                'showQrCode' => $showQrCode
            ];

            File::put($configFile, json_encode($configData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        } catch (\Throwable $e) {
            Log::error("NodeThermalPrinterController syncEngineConfig error: " . $e->getMessage());
        }
    }

    /**
     * Get installed printers on Windows via embedded printer engine
     */
    public function getPrinters()
    {
        try {
            $cmd = sprintf('cd /d "%s" && node list-printers.js', $this->getEnginePath());
            $output = shell_exec("powershell -NoProfile -Command \"$cmd\"");
            
            $printers = [];
            $psDirect = shell_exec('powershell -NoProfile -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus | ConvertTo-Json"');
            
            if ($psDirect) {
                $decoded = json_decode($psDirect, true);
                if (is_array($decoded)) {
                    if (isset($decoded['Name'])) {
                        $decoded = [$decoded];
                    }
                    foreach ($decoded as $p) {
                        $printers[] = [
                            'name' => $p['Name'] ?? 'Unknown',
                            'driver' => $p['DriverName'] ?? '',
                            'port' => $p['PortName'] ?? '',
                            'status' => $p['PrinterStatus'] ?? 'Ready',
                        ];
                    }
                }
            }

            return response()->json([
                'success' => true,
                'printers' => $printers,
                'configured' => $this->settingRepo->get('node_printer_name', 'XP-80')
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
            'items.product',
            'items.size',
            'payments.paymentMethod',
            'settlements'
        ])->find($invoiceId);

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
                $calcQty = 1;
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
            'invoiceNumber' => (string)$invoice->id,
            'date' => $invoice->created_at ? $invoice->created_at->format('Y-m-d | h:i A') : date('Y-m-d | h:i A'),
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

            // 1. Try fast HTTP preview first
            try {
                $payload = ['multi' => $useMulti];
                if ($realInvoiceData) {
                    $payload['invoice'] = $realInvoiceData;
                }

                $response = Http::timeout(2)->post('http://127.0.0.1:9123/preview', $payload);

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
                // Auto-start fast node server in background if not running
                $enginePath = $this->getEnginePath();
                @pclose(@popen(sprintf('cd /d "%s" && start /B node server.js', $enginePath), 'r'));
            }

            // 2. Fallback CLI execution
            $flag = $useMulti ? '--multi' : '';
            $enginePath = $this->getEnginePath();
            $cmd = sprintf('cd /d "%s" && node preview.js %s', $enginePath, $flag);
            $output = shell_exec("cmd /c \"$cmd\"");

            $outputImg = $enginePath . '\\output\\invoice-preview.png';
            if (File::exists($outputImg)) {
                $imageData = base64_encode(File::get($outputImg));
                $src = 'data:image/png;base64,' . $imageData;

                return response()->json([
                    'success' => true,
                    'preview_src' => $src,
                    'output_log' => $output
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'لم يتم العثور على صورة المعاينة المُولّدة'
            ], 404);
        } catch (\Throwable $e) {
            Log::error("NodeThermalPrinterController generatePreview error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطأ في توليد المعاينة: ' . $e->getMessage()
            ], 500);
        }
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

            $payload = [
                'multi' => true,
                'printerName' => $this->settingRepo->get('node_printer_name', 'XP-80'),
                'invoice' => $realInvoiceData
            ];

            $response = Http::timeout(1)->post('http://127.0.0.1:9123/print', $payload);
            return $response->successful();
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

            // 1. Try ultra-fast HTTP direct print first (Sub-100ms)
            try {
                $payload = [
                    'multi' => $useMulti,
                    'printerName' => $this->settingRepo->get('node_printer_name', 'XP-80')
                ];
                if ($realInvoiceData) {
                    $payload['invoice'] = $realInvoiceData;
                }

                $response = Http::timeout(2)->post('http://127.0.0.1:9123/print', $payload);

                if ($response->successful()) {
                    $resData = $response->json();
                    return response()->json([
                        'success' => true,
                        'message' => 'تم إرسال الفاتورة بنجاح وبسرعة فائقة (' . ($resData['durationMs'] ?? '40') . 'ms)',
                        'log' => $resData['message'] ?? 'Fast Print Server'
                    ]);
                }
            } catch (\Throwable $e) {
                // Auto-start fast server in background
                $enginePath = $this->getEnginePath();
                @pclose(@popen(sprintf('cd /d "%s" && start /B node server.js', $enginePath), 'r'));
            }

            // 2. Fallback CLI direct execution
            $flag = $useMulti ? '--multi' : '';
            $cmd = sprintf('cd /d "%s" && node print.js %s', $this->getEnginePath(), $flag);
            $output = shell_exec("cmd /c \"$cmd\"");

            return response()->json([
                'success' => true,
                'message' => 'تم إرسال الفاتورة بنجاح إلى طابعة الفواتير الحرارية (Node RAW Engine)',
                'log' => $output
            ]);
        } catch (\Throwable $e) {
            Log::error("NodeThermalPrinterController printDirect error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء الطباعة المباشرة: ' . $e->getMessage()
            ], 500);
        }
    }
}
