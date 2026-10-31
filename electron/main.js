import { app, BrowserWindow, Menu, shell, nativeTheme } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

// ضبط الثيم الافتراضي لشريط العنوان لويندوز
nativeTheme.themeSource = 'dark';

/**
 * قراءة المتغيرات من ملف .env
 */
function readEnvConfig() {
  const envPath = path.join(__dirname, '../.env');
  const config = {
    appUrl: 'http://tajori.store',
    masterHost: '',
    setupCompleted: false,
    appName: 'منظومة السحابة',
  };

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
        if (key === 'APP_SETUP_COMPLETED' && (val === 'true' || val === '1')) config.setupCompleted = true;
        if (key === 'APP_NAME' && val) config.appName = val;
      }
    } catch (e) {
      console.warn('Could not read .env file:', e.message);
    }
  }

  return config;
}

/**
 * تحديد الرابط الأولي لتحميله في النافذة
 */
function resolveInitialUrl(config) {
  // إذا كان جهاز كاشير فرعي وله مضيف محدد
  if (config.masterHost) {
    return config.masterHost.startsWith('http') ? config.masterHost : `http://${config.masterHost}`;
  }

  // إذا لم يكتمل الإعداد بعد، افتح معالج الإعداد مباشرة
  if (!config.setupCompleted) {
    return `${config.appUrl}/setup`;
  }

  return config.appUrl;
}

/**
 * إنشاء نافذة سطح المكتب الرئيسية
 */
function createMainWindow() {
  const config = readEnvConfig();
  const iconPath = path.join(__dirname, '../public/images/logo.png');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: config.appName || 'منظومة السحابة — شركة تقنية السحابة',
    backgroundColor: '#020617', // slate-950
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
    },
  });

  // إخفاء القوائم الكلاسيكية لويندوز لتجربة POS عصرية
  Menu.setApplicationMenu(null);
  mainWindow.removeMenu();

  const targetUrl = resolveInitialUrl(config);
  console.log(`[Taqniya Cloud Desktop] Loading: ${targetUrl}`);
  mainWindow.loadURL(targetUrl);

  // اختصارات لوحة المفاتيح الاحترافية
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
      }
    }
  });

  // فتح الروابط الخارجية في متصفح النظام بأمان
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

// قفل النسخة الواحدة لمنع التكرار (Single Instance Lock)
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
}

