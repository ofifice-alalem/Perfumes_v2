import { app, BrowserWindow, Menu, shell, nativeTheme, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import net from 'net';
import { spawn } from 'child_process';

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
 * قراءة المتغيرات من ملف .env
 */
function readEnvConfig() {
  const possiblePaths = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env'),
    path.join(process.resourcesPath, '.env'),
    path.join(process.resourcesPath, 'app/.env'),
    path.join(process.cwd(), '.env'),
    'C:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/.env',
    path.join(app.getPath('userData'), '.env'),
  ];

  const config = {
    appUrl: 'https://alalem.com',
    masterHost: '',
    setupCompleted: true,
    appName: 'منظومة السحابة — المبيعات',
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
          if (key === 'APP_SETUP_COMPLETED' && (val === 'false' || val === '0')) config.setupCompleted = false;
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
 * تشغيل خادم PHP مدمج صامت في الخلفية للتهيئة الأولية
 */
async function startInternalPhpServer(port = 8181) {
  const isAlreadyActive = await probePort(port);
  if (isAlreadyActive) {
    console.log(`[Taqniya Server] Port ${port} is already active.`);
    return true;
  }

  return new Promise((resolve) => {
    try {
      const projectRoot = path.join(__dirname, '..');
      internalPhpProcess = spawn('php', ['artisan', 'serve', `--port=${port}`, '--host=127.0.0.1'], {
        cwd: projectRoot,
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
        } else if (attempts > 12) {
          clearInterval(interval);
          resolve(false);
        }
      }, 500);
    } catch (e) {
      console.warn('Failed to start internal PHP server:', e.message);
      resolve(false);
    }
  });
}

/**
 * تحديد النمط التشغيلي (Settings vs POS)
 */
function resolveMode() {
  const args = process.argv;
  if (args.includes('--mode=settings') || args.includes('--settings')) {
    return 'settings';
  }
  // الوضع الافتراضي لجميع مشغلات المنظومة هو المبيعات
  return 'pos';
}

/**
 * إنشاء نافذة سطح المكتب
 */
async function createMainWindow() {
  const config = readEnvConfig();
  const mode = resolveMode();
  const iconPath = path.join(__dirname, '../public/images/logo.png');

  const isSettings = mode === 'settings';
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
    // فحص ما إذا كان Apache يعمل بالفعل على المنفذ 80
    const apacheActive = await probePort(80);
    if (apacheActive) {
      targetUrl = 'http://127.0.0.1/setup';
    } else {
      // تشغيل خادم محلي مؤقت لعرض المعالج
      console.log('[Taqniya Desktop] Starting temporary internal setup server on port 8181...');
      await startInternalPhpServer(8181);
      targetUrl = 'http://127.0.0.1:8181/setup';
    }
  } else {
    // نمط المبيعات اليومي (POS Mode) — التوجيه المباشر لواجهة فواتير المبيعات
    let baseUrl = config.appUrl || 'https://alalem.com';
    if (config.masterHost) {
      baseUrl = config.masterHost.startsWith('http') ? config.masterHost : `https://${config.masterHost}`;
    }
    targetUrl = baseUrl.endsWith('/') ? `${baseUrl}invoices/create` : `${baseUrl}/invoices/create`;
  }

  console.log(`[Taqniya Desktop] Mode: [${mode}] — Loading: ${targetUrl}`);
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

// قفل النسخة الواحدة
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
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
