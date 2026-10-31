import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const payloadDir = path.join(distDir, 'server_payload');
const serverTarget = path.join(payloadDir, 'server');
const phpTarget = path.join(payloadDir, 'php');

console.log('🚀 Preparing Modular Server Payload for Master Server...');

// 1. تنظيف وتجهيز المجلد
if (fs.existsSync(payloadDir)) {
  fs.rmSync(payloadDir, { recursive: true, force: true });
}
fs.mkdirSync(serverTarget, { recursive: true });
fs.mkdirSync(phpTarget, { recursive: true });

// 2. نسخ PHP المحمول
console.log('📦 Copying Portable PHP 8.4 runtime...');
const phpSource = path.join(rootDir, 'runtime/php');
if (fs.existsSync(phpSource)) {
  execSync(`robocopy "${phpSource}" "${phpTarget}" /E /XJ /R:1 /W:1 /MT:8 /NFL /NDL /NJH /NJS /nc /ns /np || exit 0`, { shell: 'cmd.exe' });
}

// 3. نسخ مكونات خادم Laravel
console.log('📦 Copying Laravel Server core files and vendor...');
const dirsToCopy = [
  'app',
  'bootstrap',
  'config',
  'database',
  'public',
  'resources/views',
  'routes',
  'storage',
  'vendor',
];

for (const dir of dirsToCopy) {
  const src = path.join(rootDir, dir);
  const dest = path.join(serverTarget, dir);
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    execSync(`robocopy "${src}" "${dest}" /E /XJ /R:1 /W:1 /MT:8 /XD cache sessions logs backups storage /XF *.log *.tmp /NFL /NDL /NJH /NJS /nc /ns /np || exit 0`, { shell: 'cmd.exe' });
  }
}

// نسخ ملفات الجذر المهمة
const filesToCopy = ['artisan', '.env.example'];
for (const file of filesToCopy) {
  const src = path.join(rootDir, file);
  const dest = path.join(serverTarget, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// التأكد من وجود مجلدات storage الأساسية
const storageDirs = [
  'storage/app/public',
  'storage/framework/cache/data',
  'storage/framework/sessions',
  'storage/framework/views',
  'storage/logs',
];
for (const sDir of storageDirs) {
  fs.mkdirSync(path.join(serverTarget, sDir), { recursive: true });
}

console.log('✅ Server Payload folder ready at: ' + payloadDir);

// 4. إنشاء ملف server_payload.zip مضغوط بجانب الـ Setup
const zipPath = path.join(distDir, 'server_payload.zip');
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}
console.log('🗜️ Creating server_payload.zip archive using tar...');
try {
  execSync(`tar -cf "${zipPath}" -C "${distDir}" server_payload`, { stdio: 'inherit' });
  console.log('🎉 Successfully generated: ' + zipPath);
} catch (e) {
  console.warn('Zip creation warning:', e.message);
}

