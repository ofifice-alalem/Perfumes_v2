<?php

namespace App\Http\Controllers;

use App\Repositories\Contracts\SettingRepositoryInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use PDO;

class SetupWizardController extends Controller
{
    public function __construct(private SettingRepositoryInterface $settingRepo) {}

    /**
     * التحقق مما إذا كان إعداد النظام قد اكتمل مسبقاً
     */
    public static function isSetupCompleted(): bool
    {
        // 1. فحص ملف البيئة
        if (env('APP_SETUP_COMPLETED') === true || env('APP_SETUP_COMPLETED') === 'true') {
            return true;
        }

        // 2. فحص قاعدة البيانات إذا كانت متصلة وجدول settings موجود
        try {
            DB::connection()->getPdo();
            if (DB::getSchemaBuilder()->hasTable('settings')) {
                $val = DB::table('settings')->where('key', 'app_setup_completed')->value('value');
                if ($val === '1' || $val === 'true') {
                    return true;
                }
            }
        } catch (\Throwable $e) {
            return false;
        }

        return false;
    }

    /**
     * عرض واجهة معالج الإعداد الأولي وإعدادات الخادم (Setup & Server Settings Wizard)
     */
    public function index(): Response
    {
        $localIP = $this->resolveLocalIP();
        $isCompleted = self::isSetupCompleted();

        $appUrl = env('APP_URL');
        $configuredDomain = ($appUrl && !str_contains($appUrl, 'localhost') && !str_contains($appUrl, '127.0.0.1'))
            ? parse_url($appUrl, PHP_URL_HOST)
            : '';

        // إذا كانت المنظومة لم تكتمل تهيئتها بعد، لا نفرض perfumes_v2 كاسم ثابت
        $envDatabase = env('DB_DATABASE', '');
        $initialDatabase = ($envDatabase === 'perfumes_v2' && !$isCompleted) ? '' : $envDatabase;

        $storeName = $isCompleted 
            ? $this->settingRepo->get('store_name', env('APP_NAME', '')) 
            : (env('APP_NAME') && env('APP_NAME') !== 'Laravel' && env('APP_NAME') !== 'alharith.ly' ? env('APP_NAME') : '');

        return Inertia::render('Setup/Wizard', [
            'initialConfig' => [
                'db_host'     => env('DB_HOST', '127.0.0.1'),
                'db_port'     => (int)env('DB_PORT', 3306),
                'db_database' => $initialDatabase,
                'db_username' => env('DB_USERNAME', 'root'),
                'store_name'  => $storeName,
                'domain'      => $configuredDomain ?: '',
                'server_ip'   => $localIP,
            ],
            'companyInfo' => [
                'name'    => 'شركة تقنية السحابة',
                'brand'   => 'Taqniya Cloud',
                'product' => 'منظومة السحابة المتكاملة',
            ],
            'isConfigured' => $isCompleted,
        ]);
    }

    /**
     * فحص الاتصال بقاعدة بيانات MySQL قبل الاعتماد
     */
    public function testDatabase(Request $request)
    {
        $request->validate([
            'db_host'     => 'required|string',
            'db_port'     => 'required|numeric',
            'db_database' => 'required|string',
            'db_username' => 'required|string',
            'db_password' => 'nullable|string',
        ]);

        $host     = $request->input('db_host');
        $port     = $request->input('db_port');
        $database = $request->input('db_database');
        $username = $request->input('db_username');
        $password = $request->input('db_password') ?? '';

        try {
            // محاولة الاتصال بخادم MySQL العام
            $dsn = "mysql:host={$host};port={$port};charset=utf8mb4";
            $pdo = new PDO($dsn, $username, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 4,
            ]);

            // التحقق من وجود قاعدة البيانات أو إنشاؤها إن لم تكن موجودة
            $stmt = $pdo->query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '{$database}'");
            $exists = (bool)$stmt->fetchColumn();

            if (!$exists) {
                $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $dbMsg = "تم إنشاء قاعدة البيانات `{$database}` والاتصال بها بنجاح!";
            } else {
                $dbMsg = "تم الاتصال بقاعدة البيانات `{$database}` بنجاح!";
            }

            return response()->json([
                'success' => true,
                'message' => $dbMsg,
            ]);
        } catch (\PDOException $e) {
            return response()->json([
                'success' => false,
                'message' => 'فشل الاتصال بخادم MySQL: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * فحص الاتصال بالسيرفر الرئيسي (لنمط الجهاز الفرعي / الكاشير)
     */
    public function testHost(Request $request)
    {
        $request->validate([
            'host' => 'required|string',
        ]);

        $rawHost = trim($request->input('host'));
        // إزالة البروتوكولات الزائدة إن أدخلها المستخدم
        $cleanedHost = preg_replace('#^https?://#', '', rtrim($rawHost, '/'));

        // فحص سريع عبر السوكيت على المنفذ 80 أو 443
        $ports = [80, 443, 8000];
        $connected = false;
        $activePort = null;

        foreach ($ports as $port) {
            $fp = @fsockopen($cleanedHost, $port, $errno, $errstr, 2.0);
            if ($fp) {
                $connected = true;
                $activePort = $port;
                fclose($fp);
                break;
            }
        }

        if ($connected) {
            return response()->json([
                'success'    => true,
                'message'    => "تم الاتصال بالسيرفر الرئيسي بنجاح عبر المنفذ {$activePort}!",
                'activePort' => $activePort,
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "تعذر الوصول إلى السيرفر الرئيسي ({$cleanedHost}). تأكد من أن الجهازين متصلان بنفس شبكة Wi-Fi / المودم وأن السيرفر يعمل.",
        ], 422);
    }

    /**
     * تطبيق وحفظ إعدادات السيرفر الرئيسي (Master Server)
     */
    public function applyMaster(Request $request)
    {
        $request->validate([
            'store_name'      => 'required|string|max:255',
            'domain'          => 'required|string|max:255',
            'db_host'         => 'required|string',
            'db_port'         => 'required|numeric',
            'db_database'     => 'required|string',
            'db_username'     => 'required|string',
            'db_password'     => 'nullable|string',
            'store_logo_file' => 'nullable|image|mimes:jpeg,png,jpg,webp,svg|max:5120',
        ]);

        @ini_set('max_execution_time', '300');
        @set_time_limit(300);

        try {
            $storeName = trim($request->input('store_name'));
            $domain    = trim($request->input('domain'));
            $dbHost    = trim($request->input('db_host'));
            $dbPort    = trim($request->input('db_port'));
            $dbName    = trim($request->input('db_database'));
            $dbUser    = trim($request->input('db_username'));
            $dbPass    = $request->input('db_password') ?? '';

            // 1. تحديث متغيرات ملف البيئة .env
            $this->updateEnv([
                'APP_NAME'            => $storeName,
                'APP_URL'             => 'https://' . $domain,
                'DB_HOST'             => $dbHost,
                'DB_PORT'             => $dbPort,
                'DB_DATABASE'         => $dbName,
                'DB_USERNAME'         => $dbUser,
                'DB_PASSWORD'         => $dbPass,
                'APP_SETUP_COMPLETED' => 'true',
            ]);

            // 2. تطبيق الاتصال اللحظي في بيئة التشغيل الحالية
            Config::set('database.connections.mysql.host', $dbHost);
            Config::set('database.connections.mysql.port', $dbPort);
            Config::set('database.connections.mysql.database', $dbName);
            Config::set('database.connections.mysql.username', $dbUser);
            Config::set('database.connections.mysql.password', $dbPass);
            DB::purge('mysql');
            DB::reconnect('mysql');

            // 3. التأكد من إنشاء قاعدة البيانات إن لم تكن موجودة
            $pdo = DB::connection('mysql')->getPdo();

            // 4. تشغيل ترحيل الجداول والبيانات الأساسية
            Artisan::call('key:generate', ['--force' => true]);
            Artisan::call('migrate', ['--force' => true]);
            Artisan::call('db:seed', ['--class' => 'CoreSystemSeeder', '--force' => true]);

            // 5. حفظ إعدادات هوية متجر العميل وشعاره
            $this->settingRepo->set('store_name', $storeName);
            $this->settingRepo->set('app_setup_completed', '1');

            if ($request->hasFile('store_logo_file')) {
                $this->settingRepo->updateReceiptLogo($request->file('store_logo_file'));
            }

            // 6. حفظ التكوين المشترك لتطبيق سطح المكتب ليقرأه الكاشير والمبيعات مباشرة
            $this->saveSharedDesktopConfig([
                'domain'          => $domain,
                'app_url'         => "https://{$domain}",
                'store_name'      => $storeName,
                'setup_completed' => true,
                'role'            => 'master',
            ]);

            // 7. إنشاء اختصار منظومة المبيعات على سطح المكتب وقائمة ابدأ فور اكتمال الإعدادات
            $this->createPosDesktopShortcut();

            // 8. إضافة النطاق لملف Hosts لويندوز وتجهيز شهادة SSL وخادم Apache
            $this->appendDomainToHostsFile($domain);
            $this->ensureSslAndVhosts($domain);

            // 9. جدولة إعادة تشغيل Apache في الخلفية دون مقاطعة استجابة العميل الحالية
            $this->scheduleBackgroundApacheRestart();

            return response()->json([
                'success'  => true,
                'message'  => "تم إعداد وتهيئة منظومة السحابة لمتجر «{$storeName}» بنجاح!",
                'redirect' => "https://{$domain}/login",
            ]);
        } catch (\Throwable $e) {
            Log::error('applyMaster setup error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء تطبيق الإعدادات: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * تطبيق وحفظ إعدادات الجهاز الفرعي (Cashier Client)
     */
    public function applyClient(Request $request)
    {
        $request->validate([
            'server_host' => 'required|string',
            'domain'      => 'nullable|string',
        ]);

        $serverHost = trim($request->input('server_host'));
        $domain     = trim($request->input('domain') ?: 'cloud-pos.local');

        try {
            // تحديث .env للجهاز الفرعي
            $this->updateEnv([
                'APP_SETUP_COMPLETED' => 'true',
                'MASTER_SERVER_HOST'  => $serverHost,
                'APP_URL'             => 'http://' . ($domain ?: $serverHost),
            ]);

            // إذا كان المدخل عنوان IP، نضيفه لملف Hosts مع الدومين
            if (filter_var($serverHost, FILTER_VALIDATE_IP)) {
                $this->appendDomainToHostsFile($domain, $serverHost);
            }

            // حفظ التكوين المشترك لتطبيق سطح المكتب ليقرأه الكاشير مباشرة
            $this->saveSharedDesktopConfig([
                'domain'          => $domain,
                'master_host'     => $serverHost,
                'app_url'         => 'http://' . ($domain ?: $serverHost),
                'setup_completed' => true,
                'role'            => 'client',
            ]);

            // إنشاء اختصار منظومة المبيعات على سطح المكتب وقائمة ابدأ
            $this->createPosDesktopShortcut();

            return response()->json([
                'success'  => true,
                'message'  => 'تم ربط جهاز الكاشير بالسيرفر الرئيسي بنجاح!',
                'redirect' => 'http://' . ($domain ?: $serverHost),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء حفظ الإعدادات: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * استخراج عنوان الـ IP المحلي في الشبكة
     */
    private function resolveLocalIP(): string
    {
        try {
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $output = @shell_exec('ipconfig');
                if ($output && preg_match('/IPv4 Address[ .]*:[ ]*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/', $output, $matches)) {
                    return $matches[1];
                }
            }

            $host = gethostname();
            $ip = gethostbyname($host);
            if (!empty($ip) && $ip !== '127.0.0.1' && filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        } catch (\Throwable $e) {}

        return '127.0.0.1';
    }

    /**
     * إضافة النطاق إلى ملف Windows Hosts لتشغيله محلياً
     */
    private function appendDomainToHostsFile(string $domain, string $targetIp = '127.0.0.1'): void
    {
        if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') return;

        $hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
        if (file_exists($hostsPath) && is_writable($hostsPath)) {
            try {
                $content = file_get_contents($hostsPath);
                if (!str_contains($content, $domain)) {
                    $entry = "\n{$targetIp}    {$domain}\n{$targetIp}    www.{$domain}\n";
                    @file_put_contents($hostsPath, $content . $entry);
                }
                return;
            } catch (\Throwable $e) {}
        }

        // إذا لم يكن قابلاً للكتابة المباشرة (نقص الصلاحيات)، يتم تشغيل إضافة آمنة عبر PowerShell
        try {
            $psScript = "if (-not (Select-String -Path \$env:windir\\System32\\drivers\\etc\\hosts -Pattern '{$domain}')) { Add-Content -Path \$env:windir\\System32\\drivers\\etc\\hosts -Value \"`n{$targetIp}    {$domain}`n{$targetIp}    www.{$domain}\" }";
            $cmd = "powershell -WindowStyle Hidden -Command \"Start-Process powershell -Verb RunAs -WindowStyle Hidden -ArgumentList '-Command {$psScript}'\"";
            @shell_exec($cmd);
        } catch (\Throwable $e) {
            Log::warning('Hosts file update skipped: ' . $e->getMessage());
        }
    }

    /**
     * تجهيز شهادة الأمان SSL للنطاق وتحديث VirtualHosts لخادم Apache
     */
    private function ensureSslAndVhosts(string $domain): void
    {
        $vhostsPath = 'C:\\Apache24\\conf\\extra\\httpd-vhosts.conf';
        $mkcertPath = 'C:\\Apache24\\bin\\mkcert.exe';
        $sslDir     = 'C:\\Apache24\\conf\\ssl';
        $caDir      = 'C:\\Apache24\\conf\\ssl\\ca';
        $publicPath = str_replace('\\', '/', public_path());

        try {
            // 1. توليد شهادة SSL محلية موثوقة تغطي دائماً tajori.store وأي دومين إضافي عبر PowerShell بدون أخطاء escaping
            if (file_exists($mkcertPath)) {
                if (!is_dir($sslDir)) {
                    @mkdir($sslDir, 0777, true);
                }

                $certFile = "{$sslDir}\\tajori.store.pem";
                $keyFile  = "{$sslDir}\\tajori.store-key.pem";

                $psScript = "\$env:CAROOT = '{$caDir}'; "
                          . "& '{$mkcertPath}' -install; "
                          . "& '{$mkcertPath}' -cert-file '{$certFile}' -key-file '{$keyFile}' 'tajori.store' '*.tajori.store' '{$domain}' '*.{$domain}' 'localhost' '127.0.0.1' '::1'";

                $psCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"{$psScript}\" 2>&1";
                $output = @shell_exec($psCommand);
                Log::info("mkcert generation output: " . ($output ?: 'empty'));

                @copy($certFile, "{$sslDir}\\server.pem");
                @copy($keyFile, "{$sslDir}\\server-key.pem");
            }

            // 2. تحديث ملف vhosts وفق المعايير المعتمدة في steps_v2/deployment_and_maintenance
            if (file_exists($vhostsPath) && is_writable($vhostsPath)) {
                $vhostConfig = <<<EOT
# Virtual Hosts Configuration for Perfumes_v2 / Tajori Store (Standard Ports 80 & 443)

Listen 0.0.0.0:443
Listen [::]:443

<IfModule ssl_module>
    SSLSessionCache "shmcb:logs/ssl_scache(512000)"
    SSLSessionCacheTimeout 300
</IfModule>

<Directory "{$publicPath}">
    Options Indexes FollowSymLinks MultiViews
    AllowOverride All
    Require all granted
</Directory>

# 1. HTTP (Port 80) - إعادة التوجيه التلقائي الدائم إلى HTTPS
<VirtualHost *:80>
    ServerName tajori.store
    ServerAlias www.tajori.store {$domain} www.{$domain} localhost 127.0.0.1
    DocumentRoot "{$publicPath}"

    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

    <Directory "{$publicPath}">
        Options Indexes FollowSymLinks MultiViews
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog "logs/tajori.store-http-error.log"
    CustomLog "logs/tajori.store-http-access.log" combined
</VirtualHost>

# 2. HTTPS (Port 443) - الموقع الآمن
<VirtualHost *:443>
    ServerName tajori.store
    ServerAlias www.tajori.store {$domain} www.{$domain} localhost 127.0.0.1
    DocumentRoot "{$publicPath}"

    SSLEngine on
    SSLCertificateFile "C:/Apache24/conf/ssl/tajori.store.pem"
    SSLCertificateKeyFile "C:/Apache24/conf/ssl/tajori.store-key.pem"

    <Directory "{$publicPath}">
        Options Indexes FollowSymLinks MultiViews
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog "logs/tajori.store-error.log"
    CustomLog "logs/tajori.store-access.log" combined
</VirtualHost>
EOT;
                @file_put_contents($vhostsPath, $vhostConfig);
            }
        } catch (\Throwable $e) {
            Log::warning('SSL and Vhosts update skipped: ' . $e->getMessage());
        }
    }

    /**
     * تحديث قيم ملف .env بأمان
     */
    private function updateEnv(array $values): void
    {
        $envPath = base_path('.env');
        if (!file_exists($envPath)) {
            if (file_exists(base_path('.env.example'))) {
                copy(base_path('.env.example'), $envPath);
            } else {
                touch($envPath);
            }
        }

        $content = file_get_contents($envPath);

        foreach ($values as $key => $value) {
            $key = strtoupper($key);
            $formattedValue = (str_contains($value, ' ') || str_contains($value, '#') || str_contains($value, '='))
                ? '"' . addcslashes($value, '"') . '"'
                : $value;

            if (preg_match("/^{$key}=.*/m", $content)) {
                $content = preg_replace("/^{$key}=.*/m", "{$key}={$formattedValue}", $content);
            } else {
                $content .= "\n{$key}={$formattedValue}";
            }
        }

        file_put_contents($envPath, $content);
    }

    /**
     * حفظ التكوين المشترك لنظام سطح المكتب (Electron) لجميع مستخدمي وبيئات ويندوز
     */
    private function saveSharedDesktopConfig(array $data): void
    {
        try {
            $jsonData = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            // 1. الحفظ في مجلد ProgramData المشترك لجميع الحسابات والخدمات
            $programData = getenv('ProgramData') ?: (getenv('ALLUSERSPROFILE') ?: 'C:\\ProgramData');
            $sharedDir1 = $programData . '\\TaqniyaCloudShared';
            if (!is_dir($sharedDir1)) {
                @mkdir($sharedDir1, 0777, true);
            }
            @file_put_contents($sharedDir1 . '\\app_config.json', $jsonData);

            // 2. الحفظ في مجلد AppData للمستخدم الحالي
            $userAppData = getenv('APPDATA');
            if ($userAppData) {
                $sharedDir2 = $userAppData . '\\TaqniyaCloudShared';
                if (!is_dir($sharedDir2)) {
                    @mkdir($sharedDir2, 0777, true);
                }
                @file_put_contents($sharedDir2 . '\\app_config.json', $jsonData);
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to save shared desktop config: ' . $e->getMessage());
        }
    }

    /**
     * واجهة API مخصصة لإنشاء أو إعادة توليد اختصار المبيعات على سطح المكتب عند الطلب
     */
    public function createPosShortcutEndpoint(Request $request)
    {
        $domain = $request->input('domain');
        $success = $this->createPosDesktopShortcut($domain);

        return response()->json([
            'success' => $success,
            'message' => $success 
                ? 'تم إنشاء اختصار منظومة المبيعات على سطح المكتب بنجاح!' 
                : 'تعذر إنشاء الاختصار تلقائياً، تأكد من صلاحيات النظام.',
        ]);
    }

    /**
     * إنشاء اختصار منظومة المبيعات على سطح المكتب وقائمة ابدأ بعد اكتمال الإعداد الأولي بنجاح
     */
    private function createPosDesktopShortcut(?string $customDomain = null): bool
    {
        try {
            $conf = json_decode(@file_get_contents('C:\\ProgramData\\TaqniyaCloudShared\\app_config.json') ?: '{}', true);
            $domain = $customDomain ?: ($conf['domain'] ?? parse_url(env('APP_URL'), PHP_URL_HOST) ?? 'tajori.store');
            $httpsUrl = "https://{$domain}/invoices/create";

            // 1. البحث عن مسار تطبيق منظومة السحابة.exe الفعلي
            $installPath = null;

            // أ. فحص السجل (Registry) المكتوب بواسطة المثبت
            $regCommands = [
                'reg query "HKCU\Software\TaqniyaCloud" /v InstallPath',
                'reg query "HKLM\Software\TaqniyaCloud" /v InstallPath',
            ];
            foreach ($regCommands as $rc) {
                $out = @shell_exec($rc);
                if ($out && preg_match('/InstallPath\s+REG_SZ\s+(.+)/i', trim($out), $m)) {
                    $p = trim($m[1]);
                    if (is_dir($p) && file_exists("{$p}\\منظومة السحابة.exe")) {
                        $installPath = $p;
                        break;
                    }
                }
            }

            // ب. فحص المسارات القياسية المعروفة
            if (!$installPath) {
                $possibleExePaths = [
                    'C:\\Program Files\\منظومة السحابة\\منظومة السحابة.exe',
                    'C:\\Program Files\\taqniya-cloud-pos\\منظومة السحابة.exe',
                    getenv('LOCALAPPDATA') . '\\Programs\\منظومة السحابة\\منظومة السحابة.exe',
                    getenv('LOCALAPPDATA') . '\\Programs\\taqniya-cloud-pos\\منظومة السحابة.exe',
                    base_path('..\\منظومة السحابة.exe'),
                    dirname(public_path()) . '\\منظومة السحابة.exe',
                ];
                foreach ($possibleExePaths as $pe) {
                    if ($pe && file_exists($pe)) {
                        $installPath = dirname($pe);
                        break;
                    }
                }
            }

            // 2. تجميع كافة مسارات أسطح المكتب للمستخدمين والمشترك العام
            $desktops = [
                'C:\\Users\\Public\\Desktop',
                getenv('PUBLIC') ? getenv('PUBLIC') . '\\Desktop' : 'C:\\Users\\Public\\Desktop',
            ];

            foreach (glob('C:\\Users\\*', GLOB_ONLYDIR) as $uDir) {
                $bName = basename($uDir);
                if (in_array(strtolower($bName), ['all users', 'default', 'default user', 'public'])) continue;
                if (is_dir("{$uDir}\\OneDrive\\Desktop")) $desktops[] = "{$uDir}\\OneDrive\\Desktop";
                if (is_dir("{$uDir}\\Desktop")) $desktops[] = "{$uDir}\\Desktop";
            }
            $desktops = array_unique(array_filter($desktops, 'is_dir'));

            // مجلد البرامج في قائمة ابدأ
            $smDir = (getenv('ProgramData') ?: 'C:\\ProgramData') . '\\Microsoft\\Windows\\Start Menu\\Programs\\منظومة السحابة';
            if (!is_dir($smDir)) {
                @mkdir($smDir, 0777, true);
            }

            // 3. إنشاء الاختصارات ديناميكياً باستخدام PowerShell لتفادي مشاكل الحروف العربية في COM
            $edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
            if (!file_exists($edgePath)) {
                $edgePath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
            }

            $useExe = ($installPath && file_exists("{$installPath}\\منظومة السحابة.exe"));
            $targetExe = $useExe ? "{$installPath}\\منظومة السحابة.exe" : $edgePath;
            $targetArgs = $useExe ? '--mode=pos' : "--app={$httpsUrl} --kiosk-printing --start-fullscreen";
            $workDir = $useExe ? $installPath : dirname($edgePath);

            $psLines = [
                '$ws = New-Object -ComObject WScript.Shell',
                '$fso = New-Object -ComObject Scripting.FileSystemObject',
                "\$file = \$fso.GetFile('{$targetExe}')",
                '$shortExe = $file.ShortPath',
            ];

            $allTargets = $desktops;
            $allTargets[] = $smDir;

            foreach ($allTargets as $idx => $dir) {
                $tmpLnk = "{$dir}\\TaqniyaPOS_tmp_{$idx}.lnk";
                $finalLnk = "منظومة السحابة.lnk";
                $psLines[] = "\$s = \$ws.CreateShortcut('{$tmpLnk}')";
                $psLines[] = "\$s.TargetPath = \$shortExe";
                $psLines[] = "\$s.Arguments = '{$targetArgs}'";
                $psLines[] = "\$s.WorkingDirectory = '{$workDir}'";
                $psLines[] = "\$s.Save()";
                $psLines[] = "if (Test-Path '{$dir}\\{$finalLnk}') { Remove-Item -LiteralPath '{$dir}\\{$finalLnk}' -Force -ErrorAction SilentlyContinue }";
                $psLines[] = "Rename-Item -LiteralPath '{$tmpLnk}' -NewName '{$finalLnk}' -Force -ErrorAction SilentlyContinue";
            }

            $psFile = sys_get_temp_dir() . '\\create_pos_shortcut_' . uniqid() . '.ps1';
            file_put_contents($psFile, "\xEF\xBB\xBF" . implode("\r\n", $psLines));
            @shell_exec("powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"{$psFile}\"");
            @unlink($psFile);

            return true;
        } catch (\Throwable $e) {
            Log::warning('Could not create POS desktop shortcut: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * إعادة تشغيل خدمة Apache2.4 في الخلفية دون قطع استجابة HTTP الحالية
     */
    private function scheduleBackgroundApacheRestart(): void
    {
        try {
            $tempVbs = sys_get_temp_dir() . '\\delayed_restart_' . uniqid() . '.vbs';
            $vbs = <<<VBS
WScript.Sleep 1200
Set WshShell = CreateObject("WScript.Shell")
' 1. إعادة التحميل السلس والآني لشارات SSL وملفات vhosts عبر httpd -k restart بدون الحاجة لصلاحيات Administrator
Dim exitCode
exitCode = WshShell.Run("cmd /c ""C:\Apache24\bin\httpd.exe -k restart""", 0, True)

' 2. في حال كان السيرفر متوقفاً بالكامل يتم تشغيل الخدمة
If exitCode <> 0 Then
    WshShell.Run "cmd /c ""net start Apache2.4""", 0, True
End If
VBS;
            file_put_contents($tempVbs, $vbs);
            @pclose(@popen("start /B wscript //nologo \"{$tempVbs}\"", "r"));
        } catch (\Throwable $e) {
            Log::warning('Delayed Apache restart failed: ' . $e->getMessage());
        }
    }
}

