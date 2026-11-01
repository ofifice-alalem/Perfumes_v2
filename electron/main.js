import { app, BrowserWindow, Menu, shell, nativeTheme, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import net from 'net';
import { spawn, execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let internalPhpProcess = null;

// ثيم ويندوز الداكن الافتراضي
nativeTheme.themeSource = 'dark';

/**
 * فحص ما إذا كان منفذ معين يعمل ويستجيب للاتصال
 */
function probePort(port, host = '127.0.0.1', timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let hasResolved = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      hasResolved = true;
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      if (!hasResolved) {
        hasResolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.on('error', () => {
      if (!hasResolved) {
        hasResolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

/**
 * تحديد النمط التشغيلي (Settings vs POS)
 */
function resolveMode() {
  const args = process.argv;
  for (const arg of args) {
    if (typeof arg === 'string') {
      const lower = arg.toLowerCase().trim();
      if (lower === '--mode=settings' || lower === '--settings' || lower.includes('mode=settings')) {
        return 'settings';
      }
    }
  }
  return 'pos';
}

const currentMode = resolveMode();
const isSettingsMode = currentMode === 'settings';

// عزل مجلد بيانات الجلسة لكل تطبيق حتى يكون لكل مشغل قفل نسخة واحدة مستقل
try {
  const customUserData = path.join(
    app.getPath('appData'),
    isSettingsMode ? 'TaqniyaCloudSettings' : 'TaqniyaCloudPOS'
  );
  app.setPath('userData', customUserData);
} catch (e) {
  console.warn('Could not set custom userData:', e.message);
}

/**
 * فحص وتثبيت خدمات النظام الأساسية (Apache24 و PHP 8.4) تلقائياً على نظام ويندوز للعميل الجديد
 */
function ensureSystemHostPrerequisites() {
  try {
    const resourcesDir = process.resourcesPath;
    const possiblePhpSources = [
      path.join(resourcesDir, 'php'),
      path.join(resourcesDir, 'server_payload/php'),
      path.join(path.dirname(process.execPath), 'php'),
      path.join(path.dirname(process.execPath), 'server_payload/php'),
    ];
    const possibleApacheSources = [
      path.join(resourcesDir, 'apache'),
      path.join(resourcesDir, 'server_payload/apache'),
      path.join(path.dirname(process.execPath), 'apache'),
      path.join(path.dirname(process.execPath), 'server_payload/apache'),
    ];

    // 1. تثبيت PHP في C:\php-8.4.24 إن لم يكن موجوداً
    if (!fs.existsSync('C:/php-8.4.24/php.exe')) {
      for (const pSrc of possiblePhpSources) {
        if (fs.existsSync(path.join(pSrc, 'php.exe'))) {
          console.log(`[Taqniya Desktop] Deploying PHP runtime from ${pSrc} to C:\\php-8.4.24...`);
          execSync(`robocopy "${pSrc}" "C:\\php-8.4.24" /E /XJ /R:1 /W:1 /MT:8 /NFL /NDL /NJH /NJS /nc /ns /np || exit 0`, { shell: 'cmd.exe', windowsHide: true });
          break;
        }
      }
    }

    // 2. تثبيت Apache في C:\Apache24 وتسجيل الخدمة إن لم يكن موجوداً
    if (!fs.existsSync('C:/Apache24/bin/httpd.exe')) {
      for (const aSrc of possibleApacheSources) {
        if (fs.existsSync(path.join(aSrc, 'bin/httpd.exe'))) {
          console.log(`[Taqniya Desktop] Deploying Apache Server from ${aSrc} to C:\\Apache24...`);
          execSync(`robocopy "${aSrc}" "C:\\Apache24" /E /XJ /R:1 /W:1 /MT:8 /XD logs /NFL /NDL /NJH /NJS /nc /ns /np || exit 0`, { shell: 'cmd.exe', windowsHide: true });
          try {
            execSync('cmd /c "C:\\Apache24\\bin\\httpd.exe -k install -n Apache2.4 & sc config Apache2.4 start= auto & net start Apache2.4"', { windowsHide: true });
          } catch (e) {}
          try {
            if (fs.existsSync('C:/Apache24/bin/mkcert.exe')) {
              execSync('cmd /c "C:\\Apache24\\bin\\mkcert.exe -install"', { windowsHide: true });
            }
          } catch (e) {}
          break;
        }
      }
    }
  } catch (e) {
    console.warn('[Taqniya Desktop] ensureSystemHostPrerequisites warning:', e.message);
  }
}

/**
 * فك حزمة السيرفر server_payload.zip تلقائياً إن وجدت
 */
function extractPayloadIfPresent() {
  const possibleZipPaths = [
    path.join(process.resourcesPath, 'server_payload.zip'),
    path.join(path.dirname(process.execPath), 'server_payload.zip'),
    path.join(process.cwd(), 'server_payload.zip'),
  ];

  for (const zipPath of possibleZipPaths) {
    if (fs.existsSync(zipPath)) {
      const targetDir = process.resourcesPath;
      const artisanCheck = path.join(targetDir, 'server/artisan');
      if (!fs.existsSync(artisanCheck)) {
        console.log(`[Taqniya Desktop] Extracting server payload from ${zipPath} to ${targetDir}...`);
        try {
          execSync(`tar -xf "${zipPath}" -C "${targetDir}"`, { windowsHide: true, timeout: 30000 });
          console.log('[Taqniya Desktop] Payload extracted successfully.');
          ensureSystemHostPrerequisites();
          return true;
        } catch (e) {
          console.warn('[Taqniya Desktop] Payload extraction error:', e.message);
        }
      }
    }
  }
  ensureSystemHostPrerequisites();
  return false;
}

/**
 * استخراج مسار مجلد السيرفر الأساسي (Laravel Core)
 */
function getServerRootPath() {
  extractPayloadIfPresent();

  const possiblePaths = [
    path.join(process.resourcesPath, 'server'),
    path.join(process.resourcesPath, 'server_payload/server'),
    path.join(path.dirname(process.execPath), 'server'),
    path.join(path.dirname(process.execPath), 'server_payload/server'),
    path.join(process.cwd(), 'server'),
    path.join(process.cwd(), 'resources/server'),
  ];
  if (!app.isPackaged) {
    possiblePaths.push(path.join(__dirname, '..'));
  }
  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(p, 'artisan'))) return p;
  }
  return process.cwd();
}

/**
 * استخراج مسار مفسر PHP المحمول المدمج مع الحزمة أو النظام
 */
function getPhpBinaryPath() {
  const possiblePaths = [
    path.join(process.resourcesPath, 'php/php.exe'),
    path.join(process.resourcesPath, 'server_payload/php/php.exe'),
    path.join(path.dirname(process.execPath), 'php/php.exe'),
    path.join(path.dirname(process.execPath), 'server_payload/php/php.exe'),
    'C:/php-8.4.24/php.exe',
    'C:/php/php.exe',
    'C:/Apache24/bin/php.exe',
  ];
  if (!app.isPackaged) {
    possiblePaths.push(path.join(__dirname, '../runtime/php/php.exe'));
    possiblePaths.push('C:/php-8.4.24/php.exe');
  }
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'php';
}

/**
 * قراءة المتغيرات من ملف .env الخاص بالسيرفر المثبت
 */
function readEnvConfig() {
  const serverRoot = getServerRootPath();
  const serverEnv = path.join(serverRoot, '.env');
  const serverEnvExample = path.join(serverRoot, '.env.example');

  // تهيئة .env تلقائياً من .env.example في أول تشغيل بعد التثبيت
  if (!fs.existsSync(serverEnv) && fs.existsSync(serverEnvExample)) {
    try {
      fs.copyFileSync(serverEnvExample, serverEnv);
    } catch (e) {
      console.warn('Could not initialize .env from .env.example:', e.message);
    }
  }

  const possiblePaths = [
    serverEnv,
    path.join(process.resourcesPath, 'server/.env'),
    path.join(app.getPath('userData'), '.env'),
  ];

  if (!app.isPackaged) {
    possiblePaths.push(path.join(__dirname, '../.env'));
  }

  const config = {
    appUrl: '',
    masterHost: '',
    setupCompleted: false, // افتراضياً غير مكتمل للأجهزة والنسخ الجديدة
    appName: 'منظومة السحابة — المبيعات',
    domain: '',
  };

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const [key, ...values] = trimmed.split('=');
          const val = values.join('=').replace(/^["']|["']$/g, '');

          if (key === 'APP_URL' && val) config.appUrl = val;
          if (key === 'MASTER_SERVER_HOST' && val) config.masterHost = val;
          if (key === 'APP_SETUP_COMPLETED') {
            config.setupCompleted = (val === 'true' || val === '1');
          }
          if (key === 'APP_NAME' && val) config.appName = `${val} — منظومة السحابة`;
        }
        break;
      } catch (e) {
        console.warn('Could not read .env file from:', envPath, e.message);
      }
    }
  }

  // 🟢 2. قراءة التكوين المشترك المحفوظ من أداة الإعدادات (له الأولوية القصوى)
  const sharedConfigPaths = [
    path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'TaqniyaCloudShared', 'app_config.json'),
    path.join(process.env.ProgramData || 'C:\\ProgramData', 'TaqniyaCloudShared', 'app_config.json'),
    path.join(app.getPath('appData'), 'TaqniyaCloudShared', 'app_config.json'),
  ];

  for (const sharedPath of sharedConfigPaths) {
    if (fs.existsSync(sharedPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(sharedPath, 'utf8'));
        if (parsed.app_url) config.appUrl = parsed.app_url;
        if (parsed.master_host) config.masterHost = parsed.master_host;
        if (parsed.domain) config.domain = parsed.domain;
        if (parsed.store_name) config.appName = `${parsed.store_name} — منظومة السحابة`;
        if (parsed.setup_completed !== undefined) config.setupCompleted = Boolean(parsed.setup_completed);
        break;
      } catch (e) {
        console.warn('Could not read shared desktop config from:', sharedPath, e.message);
      }
    }
  }

  // 🟢 3. استخراج النطاق من appUrl إذا لم يكن محدداً بشكل صريح
  if (!config.domain && config.appUrl) {
    try {
      const urlObj = new URL(config.appUrl);
      if (!urlObj.hostname.includes('127.0.0.1') && !urlObj.hostname.includes('localhost')) {
        config.domain = urlObj.hostname;
      }
    } catch (e) {}
  }

  if (!config.appUrl) {
    config.appUrl = config.domain ? `https://${config.domain}` : 'http://127.0.0.1:8181';
  }

  return config;
}

/**
 * تشغيل خادم PHP مدمج صامت في الخلفية للتهيئة الأولية ونقاط البيع
 */
async function startInternalPhpServer(port = 8181) {
  const isAlreadyActive = await probePort(port);
  if (isAlreadyActive) {
    console.log(`[Taqniya Server] Port ${port} is already active.`);
    return true;
  }

  const phpBin = getPhpBinaryPath();
  const serverRoot = getServerRootPath();

  // نسخ .env.example إلى .env إذا لم يكن موجوداً
  const serverEnv = path.join(serverRoot, '.env');
  const serverEnvExample = path.join(serverRoot, '.env.example');
  if (!fs.existsSync(serverEnv) && fs.existsSync(serverEnvExample)) {
    try {
      fs.copyFileSync(serverEnvExample, serverEnv);
    } catch (e) {
      console.warn('Could not copy .env.example:', e.message);
    }
  }

  return new Promise((resolve) => {
    try {
      console.log(`[Taqniya Desktop] Spawning portable PHP: ${phpBin} at ${serverRoot}`);
      internalPhpProcess = spawn(phpBin, ['artisan', 'serve', `--port=${port}`, '--host=0.0.0.0'], {
        cwd: serverRoot,
        detached: false,
        stdio: 'ignore',
        windowsHide: true,
      });

      internalPhpProcess.on('error', (err) => {
        console.warn('Could not spawn background PHP process:', err.message);
        resolve(false);
      });

      // انتظر حتى يصبح المنفذ جاهزاً
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const active = await probePort(port);
        if (active) {
          clearInterval(interval);
          resolve(true);
        } else if (attempts > 20) {
          clearInterval(interval);
          resolve(false);
        }
      }, 500);
    } catch (e) {
      console.error('Fatal spawning PHP:', e);
      resolve(false);
    }
  });
}

let posWindow = null;

/**
 * بدء تشغيل خدمة Apache 2.4 مع طلب صلاحيات المسؤول UAC عند الحاجة
 */
async function startApacheServiceWithElevation() {
  let apacheActive = (await probePort(80)) || (await probePort(443));
  if (apacheActive) {
    return { success: true };
  }

  // 1. محاولة التشغيل القياسي لخدمة ويندوز
  let started = false;
  try {
    execSync('net start Apache2.4', { windowsHide: true, timeout: 5000 });
    started = true;
  } catch (errService) {
    console.warn('[Taqniya Desktop] Standard net start failed (likely needs admin rights):', errService.message);
  }

  // 2. إذا لم تكن الخدمة تعمل أو تم رفض الوصول، استدعاء صلاحيات المسؤول عبر PowerShell
  if (!started) {
    try {
      console.log('[Taqniya Desktop] Requesting UAC elevation to start Apache2.4 service...');
      const psCmd = 'Start-Process cmd -ArgumentList "/c net start Apache2.4" -Verb RunAs -WindowStyle Hidden';
      execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psCmd}"`, {
        windowsHide: true,
        timeout: 10000,
      });
    } catch (errUac) {
      console.warn('[Taqniya Desktop] Elevated start failed or was cancelled by user:', errUac.message);
    }
  }

  // 3. التحقق من استجابة المنافذ 80 و 443 لمدة تصل إلى 8 ثوانٍ
  for (let i = 0; i < 16; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    apacheActive = (await probePort(80)) || (await probePort(443));
    if (apacheActive) {
      console.log('[Taqniya Desktop] Apache service is now active and responding!');
      return { success: true };
    }
  }

  // 4. محاولة بديلة إضافية عبر httpd.exe المباشر
  const httpdPath = fs.existsSync('C:/Apache24/bin/httpd.exe') ? 'C:\\Apache24\\bin\\httpd.exe' : '';
  if (httpdPath) {
    try {
      console.log('[Taqniya Desktop] Attempting direct httpd service start via RunAs...');
      const psDirectCmd = `Start-Process cmd -ArgumentList "/c ""${httpdPath}"" -k start" -Verb RunAs -WindowStyle Hidden`;
      execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psDirectCmd}"`, {
        windowsHide: true,
        timeout: 10000,
      });

      for (let i = 0; i < 8; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        apacheActive = (await probePort(80)) || (await probePort(443));
        if (apacheActive) return { success: true };
      }
    } catch (e) {}
  }

  return {
    success: false,
    error: 'تعذر تشغيل خدمة Apache2.4. يرجى التأكد من الموافقة على طلب الصلاحيات كمسؤول أو تشغيل السيرفر من لوحة التحكم.',
  };
}

/**
 * التحقق من تشغيل خادم Apache 2.4 وإرسال أمر التشغيل تلقائياً إذا كان متوقفاً
 */
async function ensureApacheRunning() {
  let apacheActive = (await probePort(80)) || (await probePort(443));
  if (apacheActive) {
    return true;
  }

  console.log('[Taqniya Desktop] Apache is not running. Attempting auto-start with elevation fallback...');
  const result = await startApacheServiceWithElevation();
  return result.success;
}

/**
 * إظهار صفحة الاسترداد الأنيقة عند توقف السيرفر لمنع ظهور شاشة سوداء نهائياً
 */
function showOfflineScreen(targetWindow, targetUrl = '') {
  if (!targetWindow || targetWindow.isDestroyed()) return;

  const offlineHtmlPath = path.join(__dirname, 'server-offline.html');
  if (fs.existsSync(offlineHtmlPath)) {
    try {
      const searchParam = targetUrl ? `?target=${encodeURIComponent(targetUrl)}` : '';
      targetWindow.loadFile(offlineHtmlPath, { search: searchParam });
      return;
    } catch (e) {
      console.warn('[Taqniya Desktop] loadFile failed, fallback to direct HTML:', e.message);
    }
  }

  // 🛡️ قالب الطوارئ المضمن مباشرة داخل main.js لضمان عدم ظهور شاشة سوداء تحت أي ظرف
  const embeddedHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>خادم المنظومة متوقف — شركة تقنية السحابة</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif; user-select: none; }
    body { background-color: #0b0f15; color: #c6d4df; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px; }
    .container { background: #121822; border: 1px solid #233244; border-radius: 6px; max-width: 560px; width: 100%; padding: 36px 30px; box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7); text-align: center; position: relative; }
    .top-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #d97706, #f59e0b, #ef4444); }
    .icon-wrapper { width: 64px; height: 64px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #f59e0b; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; font-size: 11px; font-weight: 800; border-radius: 4px; margin-bottom: 12px; font-family: monospace; }
    .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; }
    h1 { font-size: 21px; font-weight: 900; color: #ffffff; margin-bottom: 10px; }
    p { font-size: 13px; line-height: 1.6; color: #8da2b5; margin-bottom: 24px; }
    .actions { display: flex; flex-direction: column; gap: 10px; }
    button { border: none; cursor: pointer; font-size: 13px; font-weight: 800; border-radius: 4px; padding: 12px 20px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.15s ease-in-out; }
    .btn-primary { background: linear-gradient(to bottom, #75b022, #588a1b); color: #ffffff; border-top: 1px solid rgba(184, 232, 75, 0.6); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5); }
    .btn-primary:hover:not(:disabled) { background: linear-gradient(to bottom, #8ed428, #68a420); }
    .btn-secondary { background: #1e2632; color: #c6d4df; border: 1px solid #304154; }
    .btn-secondary:hover:not(:disabled) { background: #2a3748; color: #ffffff; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .status-box { margin-top: 16px; padding: 10px 14px; border-radius: 4px; font-size: 12px; font-weight: 700; display: none; align-items: center; justify-content: center; gap: 8px; }
    .status-box.info { background: rgba(30, 41, 59, 0.9); border: 1px solid #334155; color: #94a3b8; }
    .status-box.success { background: rgba(22, 101, 52, 0.3); border: 1px solid #16a34a; color: #4ade80; }
    .status-box.error { background: rgba(153, 27, 27, 0.3); border: 1px solid #dc2626; color: #f87171; }
    .spinner { width: 14px; height: 14px; border: 2px solid rgba(255, 255, 255, 0.2); border-top-color: #ffffff; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .footer-note { margin-top: 24px; font-size: 11px; color: #4b6178; }
  </style>
</head>
<body>
  <div class="container">
    <div class="top-accent"></div>
    <div class="icon-wrapper">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
        <line x1="6" y1="6" x2="6.01" y2="6"></line>
        <line x1="6" y1="18" x2="6.01" y2="18"></line>
      </svg>
    </div>
    <div class="badge"><div class="badge-dot"></div><span>خادم المنظومة غير متصل (Apache Offline)</span></div>
    <h1>تعذر الاتصال بخادم Apache المحلي</h1>
    <p>يبدو أن خدمة الخادم المحلي متوقفة حالياً. اضغط على الزر أدناه لتشغيل الخادم تلقائياً أو إعادة المحاولة.</p>
    <div class="actions">
      <button id="btnStart" class="btn-primary" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span id="btnStartText">تشغيل خادم Apache الآن</span>
      </button>
      <button id="btnRetry" class="btn-secondary" type="button">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        <span>إعادة محاولة الاتصال</span>
      </button>
    </div>
    <div id="statusBox" class="status-box"></div>
    <div class="footer-note">شركة تقنية السحابة — نظام إدارة وتشغيل الخوادم المحلية</div>
  </div>
  <script>
    const targetUrl = decodeURIComponent("${encodeURIComponent(targetUrl)}");
    const btnStart = document.getElementById('btnStart');
    const btnStartText = document.getElementById('btnStartText');
    const btnRetry = document.getElementById('btnRetry');
    const statusBox = document.getElementById('statusBox');

    function showStatus(type, html) {
      statusBox.className = 'status-box ' + type;
      statusBox.innerHTML = html;
      statusBox.style.display = 'flex';
    }

    async function handleStart() {
      btnStart.disabled = true;
      btnRetry.disabled = true;
      btnStartText.textContent = 'جاري إرسال أمر تشغيل السيرفر...';
      showStatus('info', '<div class="spinner"></div><span>جاري تشغيل خادم Apache والتحقق من المنافذ...</span>');

      try {
        if (!window.electronAPI || !window.electronAPI.startApache) {
          throw new Error('خاصية التحكم بالسيرفر غير متوفرة');
        }
        const res = await window.electronAPI.startApache();
        if (res && res.success) {
          showStatus('success', '<span>✅ تم تشغيل خادم Apache بنجاح! جاري الدخول...</span>');
          setTimeout(() => {
            if (window.electronAPI.retryLoad) window.electronAPI.retryLoad(targetUrl);
            else if (targetUrl) window.location.href = targetUrl;
            else window.location.reload();
          }, 1000);
        } else {
          showStatus('error', '⚠️ تعذر التشغيل التلقائي: ' + (res?.error || 'يرجى تشغيل التطبيق كمسؤول'));
          btnStart.disabled = false;
          btnRetry.disabled = false;
          btnStartText.textContent = 'إعادة محاولة تشغيل الخادم';
        }
      } catch (err) {
        showStatus('error', '⚠️ خطأ: ' + err.message);
        btnStart.disabled = false;
        btnRetry.disabled = false;
        btnStartText.textContent = 'تشغيل خادم Apache الآن';
      }
    }

    async function handleRetry() {
      btnRetry.disabled = true;
      showStatus('info', '<div class="spinner"></div><span>جاري فحص استجابة الخادم...</span>');
      if (window.electronAPI && window.electronAPI.checkServer) {
        const isUp = await window.electronAPI.checkServer();
        if (isUp) {
          showStatus('success', '<span>✅ الخادم متصل الآن! جاري التحويل...</span>');
          setTimeout(() => {
            if (window.electronAPI.retryLoad) window.electronAPI.retryLoad(targetUrl);
            else window.location.reload();
          }, 600);
          return;
        }
      }
      setTimeout(() => {
        showStatus('error', '❌ الخادم ما زال متوقفاً. اضغط على «تشغيل خادم Apache الآن» أعلاه.');
        btnRetry.disabled = false;
      }, 1000);
    }

    btnStart.addEventListener('click', handleStart);
    btnRetry.addEventListener('click', handleRetry);
  </script>
</body>
</html>`;

  targetWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(embeddedHtml)}`);
}

/**
 * فتح نافذة المبيعات بشكل مستقل ومباشر
 */
async function createPosWindow() {
  if (posWindow && !posWindow.isDestroyed()) {
    if (posWindow.isMinimized()) posWindow.restore();
    posWindow.focus();
    return posWindow;
  }

  const config = readEnvConfig();
  const iconPath = path.join(__dirname, '../public/images/logo.png');
  const hostDomain = config.domain || 'tajori.store';

  posWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: config.appName || 'منظومة السحابة — المبيعات',
    backgroundColor: '#020617',
    autoHideMenuBar: true,
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  posWindow.maximize();
  posWindow.show();
  Menu.setApplicationMenu(null);
  posWindow.removeMenu();

  let targetUrl = '';
  if (config.masterHost) {
    const baseUrl = config.masterHost.startsWith('http') ? config.masterHost : `https://${config.masterHost}`;
    targetUrl = baseUrl.endsWith('/') ? `${baseUrl}invoices/create` : `${baseUrl}/invoices/create`;
  } else {
    targetUrl = `https://${hostDomain}/invoices/create`;
  }

  // التقاط فشل الاتصال بالسيرفر لمنع أي شاشة سوداء
  posWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return; // ERR_ABORTED
    console.warn(`[Taqniya Desktop] POS load failed (${errorCode}: ${errorDescription}) on ${validatedURL}`);
    showOfflineScreen(posWindow, targetUrl);
  });

  if (!config.masterHost) {
    const apacheActive = (await probePort(80, '127.0.0.1', 300)) || (await probePort(443, '127.0.0.1', 300));
    if (!apacheActive) {
      console.log('[Taqniya Desktop] Local Apache is offline. Showing recovery UI immediately for POS...');
      showOfflineScreen(posWindow, targetUrl);
    } else {
      console.log(`[Taqniya Desktop] Opening POS Window — Loading: ${targetUrl}`);
      posWindow.loadURL(targetUrl);
    }
  } else {
    console.log(`[Taqniya Desktop] Opening POS Window (Remote Master) — Loading: ${targetUrl}`);
    posWindow.loadURL(targetUrl);
  }

  posWindow.on('closed', () => {
    posWindow = null;
  });

  return posWindow;
}

// استقبال طلب فتح تطبيق المبيعات في نافذة مستقلة من داخل نافذة الإعدادات
ipcMain.on('open-pos-app', async () => {
  console.log('[Taqniya Desktop] Opening standalone POS Cashier window from Settings...');
  await createPosWindow();
});

// تشغيل خدمة Apache مع رفع الصلاحيات
ipcMain.handle('start-apache-service', async () => {
  return await startApacheServiceWithElevation();
});

// فحص حالة السيرفر
ipcMain.handle('check-server-status', async () => {
  return (await probePort(80)) || (await probePort(443));
});

// إعادة محاولة تحميل الرابط المطلوب
ipcMain.on('retry-load-url', (event, targetUrl) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win && !win.isDestroyed()) {
    if (targetUrl && targetUrl.startsWith('http')) {
      win.loadURL(targetUrl);
    } else {
      const config = readEnvConfig();
      const hostDomain = config.domain || 'tajori.store';
      const fallbackUrl = isSettingsMode ? `https://${hostDomain}/setup` : `https://${hostDomain}/invoices/create`;
      win.loadURL(fallbackUrl);
    }
  }
});

// فتح شاشة الإعدادات
ipcMain.on('open-settings-app', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (!win || win.isDestroyed()) return;

  const config = readEnvConfig();
  const hostDomain = config.domain || 'tajori.store';
  const apacheActive = (await probePort(80)) || (await probePort(443));
  if (apacheActive) {
    win.loadURL(`https://${hostDomain}/setup`);
  } else {
    console.log('[Taqniya Desktop] Starting portable PHP server on port 8181 for setup wizard...');
    await startInternalPhpServer(8181);
    win.loadURL('http://127.0.0.1:8181/setup');
  }
});

/**
 * إنشاء نافذة سطح المكتب
 */
async function createMainWindow() {
  const config = readEnvConfig();
  const isSettings = isSettingsMode;
  const iconPath = path.join(__dirname, '../public/images/logo.png');

  const windowTitle = isSettings 
    ? 'أداة إعدادات خادم السحابة — شركة تقنية السحابة' 
    : (config.appName || 'منظومة السحابة — المبيعات');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: windowTitle,
    backgroundColor: '#020617', // slate-950
    autoHideMenuBar: true,
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // تعظيم النافذة لملء كامل الشاشة فور الفتح
  mainWindow.maximize();
  mainWindow.show();

  Menu.setApplicationMenu(null);
  mainWindow.removeMenu();

  // تطبيق نسبة التبعيد والتقريب المحفوظة عند اكتمال تحميل الصفحة
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript('localStorage.getItem("app_zoom_factor")')
      .then((val) => {
        if (val) {
          const factor = Number(val) / 100;
          if (!isNaN(factor) && factor >= 0.5 && factor <= 2.0) {
            mainWindow.webContents.setZoomFactor(factor);
          }
        }
      })
      .catch(() => {});
  });

  // التقاط فشل الاتصال بالسيرفر لمنع أي شاشة سوداء نهائياً
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return; // ERR_ABORTED
    console.warn(`[Taqniya Desktop] Main load failed (${errorCode}: ${errorDescription}) on ${validatedURL}`);
    showOfflineScreen(mainWindow, targetUrl);
  });

  let targetUrl = '';
  const hostDomain = config.domain || 'tajori.store';

  if (config.masterHost) {
    const baseUrl = config.masterHost.startsWith('http') ? config.masterHost : `https://${config.masterHost}`;
    targetUrl = isSettings
      ? (baseUrl.endsWith('/') ? `${baseUrl}setup` : `${baseUrl}/setup`)
      : (baseUrl.endsWith('/') ? `${baseUrl}invoices/create` : `${baseUrl}/invoices/create`);
    console.log(`[Taqniya Desktop] Mode: [${currentMode}] (Remote Master) — Loading: ${targetUrl}`);
    mainWindow.loadURL(targetUrl);
  } else {
    targetUrl = isSettings ? `https://${hostDomain}/setup` : `https://${hostDomain}/invoices/create`;

    // 🟢 فحص فوري وسريع (خلال 300ms) لخادم Apache المحلي لمنع أي تأخير في إظهار الشاشة
    const apacheActive = (await probePort(80, '127.0.0.1', 300)) || (await probePort(443, '127.0.0.1', 300));
    if (!apacheActive) {
      console.log(`[Taqniya Desktop] Local Apache is offline (${currentMode} mode). Showing recovery UI instantly...`);
      showOfflineScreen(mainWindow, targetUrl);
    } else {
      console.log(`[Taqniya Desktop] Mode: [${currentMode}] — Loading: ${targetUrl}`);
      mainWindow.loadURL(targetUrl);
    }
  }

  // اختصارات لوحة المفاتيح
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      if (input.key === 'F12') {
        mainWindow.webContents.toggleDevTools();
        event.preventDefault();
      } else if (input.key === 'F11') {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
        event.preventDefault();
      } else if (input.control && input.key.toLowerCase() === 'r') {
        mainWindow.reload();
        event.preventDefault();
      } else if (input.control && (input.key === '=' || input.key === '+')) {
        const currentZoom = mainWindow.webContents.getZoomFactor();
        mainWindow.webContents.setZoomFactor(Math.min(currentZoom + 0.1, 2.0));
        event.preventDefault();
      } else if (input.control && input.key === '-') {
        const currentZoom = mainWindow.webContents.getZoomFactor();
        mainWindow.webContents.setZoomFactor(Math.max(currentZoom - 0.1, 0.5));
        event.preventDefault();
      } else if (input.control && input.key === '0') {
        mainWindow.webContents.setZoomFactor(1.0);
        event.preventDefault();
      }
    }
  });

  // التقاط وتأكيد التنزيلات داخلياً مع جلسة سطح المكتب
  mainWindow.webContents.session.on('will-download', (event, item) => {
    console.log('[Taqniya Desktop] Native file download triggered:', item.getFilename());
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      const isInternalHost = 
        parsedUrl.hostname === '127.0.0.1' || 
        parsedUrl.hostname === 'localhost' || 
        (config.domain && parsedUrl.hostname === config.domain) ||
        (config.masterHost && parsedUrl.hostname.includes(config.masterHost));

      const isDownload = 
        url.includes('/pdf') || 
        url.includes('excel=') || 
        url.includes('.pdf') || 
        url.includes('.xlsx') || 
        url.includes('.csv');

      if (isInternalHost) {
        if (isDownload) {
          // تنزيل ملفات التقارير والفواتير داخلياً بالاعتماد على جلسة المستخدم الحالية
          mainWindow.webContents.downloadURL(url);
          return { action: 'deny' };
        }
        // الروابط الداخلية تُفتح داخل نفس النافذة للحفاظ على استمرارية العمل
        mainWindow.loadURL(url);
        return { action: 'deny' };
      }
    } catch (e) {
      console.warn('URL parsing error in window open handler:', e);
    }

    // الروابط الخارجية الحقيقية فقط تفتح في متصفح النظام
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// قفل النسخة الواحدة لكل نمط مستقل
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // إذا حاول المستخدم فتح الإعدادات بينما نافذة المبيعات مفتوحة
      const wantsSettings = commandLine.some(arg =>
        typeof arg === 'string' && (arg.toLowerCase().includes('setting') || arg.toLowerCase().includes('--mode=settings'))
      );
      if (wantsSettings && !isSettingsMode) {
        const conf = readEnvConfig();
        const settingsUrl = conf.domain ? `https://${conf.domain}/setup` : 'http://127.0.0.1:8181/setup';
        mainWindow.loadURL(settingsUrl);
      }
    }
  });

  // قبول وتوثيق شهادات SSL المحلية دون إظهار تنبيهات أمنية
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
  });

  app.whenReady().then(() => {
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    if (internalPhpProcess) {
      try {
        internalPhpProcess.kill();
      } catch (e) {}
    }
  });
}
