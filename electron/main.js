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
function probePort(port, host = '127.0.0.1', timeoutMs = 800) {
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
          return true;
        } catch (e) {
          console.warn('[Taqniya Desktop] Payload extraction error:', e.message);
        }
      }
    }
  }
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
 * فتح نافذة المبيعات بشكل مستقل ومباشر
 */
function createPosWindow() {
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

  console.log(`[Taqniya Desktop] Opening POS Window — Loading: ${targetUrl}`);
  posWindow.loadURL(targetUrl);

  posWindow.on('closed', () => {
    posWindow = null;
  });

  return posWindow;
}

// استقبال طلب فتح تطبيق المبيعات في نافذة مستقلة من داخل نافذة الإعدادات
ipcMain.on('open-pos-app', () => {
  console.log('[Taqniya Desktop] Opening standalone POS Cashier window from Settings...');
  createPosWindow();
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

  let targetUrl = '';

  const apachePort80 = await probePort(80);
  const apachePort443 = await probePort(443);
  const apacheActive = apachePort80 || apachePort443;

  const hostDomain = config.domain || 'tajori.store';

  if (isSettings) {
    // ⚙️ نمط الإعدادات (Settings Mode)
    if (apacheActive) {
      targetUrl = `https://${hostDomain}/setup`;
    } else {
      console.log('[Taqniya Desktop] Starting portable PHP server on port 8181 for setup...');
      await startInternalPhpServer(8181);
      targetUrl = 'http://127.0.0.1:8181/setup';
    }
  } else {
    // 🛒 نمط المبيعات اليومي (POS Mode) — التوجيه المباشر لواجهة فواتير المبيعات
    if (config.masterHost) {
      const baseUrl = config.masterHost.startsWith('http') ? config.masterHost : `https://${config.masterHost}`;
      targetUrl = baseUrl.endsWith('/') ? `${baseUrl}invoices/create` : `${baseUrl}/invoices/create`;
    } else if (apacheActive) {
      targetUrl = `https://${hostDomain}/invoices/create`;
    } else {
      console.log('[Taqniya Desktop] Starting portable PHP server on port 8181 for POS...');
      await startInternalPhpServer(8181);
      targetUrl = 'http://127.0.0.1:8181/invoices/create';
    }
  }

  console.log(`[Taqniya Desktop] Mode: [${currentMode}] — Loading: ${targetUrl}`);
  mainWindow.loadURL(targetUrl);

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
