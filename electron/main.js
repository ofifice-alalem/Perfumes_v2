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
    appUrl: 'http://127.0.0.1:8181',
    masterHost: '',
    setupCompleted: false, // افتراضياً غير مكتمل للأجهزة والنسخ الجديدة
    appName: 'منظومة السحابة — المبيعات',
    domain: '',
  };

  // 🟢 1. قراءة التكوين المشترك المحفوظ من أداة الإعدادات
  const sharedConfigPath = path.join(app.getPath('appData'), 'TaqniyaCloudShared', 'app_config.json');
  if (fs.existsSync(sharedConfigPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(sharedConfigPath, 'utf8'));
      if (parsed.app_url) config.appUrl = parsed.app_url;
      if (parsed.master_host) config.masterHost = parsed.master_host;
      if (parsed.domain) config.domain = parsed.domain;
      if (parsed.store_name) config.appName = `${parsed.store_name} — منظومة السحابة`;
      if (parsed.setup_completed) config.setupCompleted = true;
    } catch (e) {
      console.warn('Could not read shared desktop config:', e.message);
    }
  }

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

// استقبال طلب فتح تطبيق المبيعات في نافذة مستقلة من داخل نافذة الإعدادات
ipcMain.on('open-pos-app', () => {
  console.log('[Taqniya Desktop] Spawning standalone POS Cashier window from Settings...');
  try {
    const appExecutable = process.execPath;
    const child = spawn(appExecutable, ['--mode=pos'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } catch (e) {
    console.error('[Taqniya Desktop] Failed to launch POS app:', e);
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

  let targetUrl = '';

  if (isSettings) {
    // ⚙️ نمط الإعدادات: التوجيه دائماً لمعالج الإعداد
    const apacheActive = await probePort(80);
    if (apacheActive) {
      targetUrl = 'http://127.0.0.1/setup';
    } else {
      console.log('[Taqniya Desktop] Starting portable PHP server on port 8181 for setup...');
      await startInternalPhpServer(8181);
      targetUrl = 'http://127.0.0.1:8181/setup';
    }
  } else {
    // 🛒 نمط المبيعات اليومي (POS Mode) — التوجيه المباشر والدائم لواجهة فواتير المبيعات
    if (config.masterHost) {
      const baseUrl = config.masterHost.startsWith('http') ? config.masterHost : `https://${config.masterHost}`;
      targetUrl = baseUrl.endsWith('/') ? `${baseUrl}invoices/create` : `${baseUrl}/invoices/create`;
    } else {
      const apacheActive = await probePort(80);
      if (apacheActive) {
        // إذا كان هناك نطاق مخصص محفوظ في الإعدادات، نوجه إليه مباشرة
        let baseUrl = 'http://127.0.0.1';
        if (config.appUrl && !config.appUrl.includes('8181') && !config.appUrl.includes('localhost')) {
          baseUrl = config.appUrl;
        }
        targetUrl = baseUrl.endsWith('/') ? `${baseUrl}invoices/create` : `${baseUrl}/invoices/create`;
      } else {
        console.log('[Taqniya Desktop] Starting portable PHP server on port 8181 for POS...');
        await startInternalPhpServer(8181);
        targetUrl = 'http://127.0.0.1:8181/invoices/create';
      }
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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
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
        mainWindow.loadURL('http://127.0.0.1:8181/setup');
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
