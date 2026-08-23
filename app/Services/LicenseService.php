<?php

namespace App\Services;

use Illuminate\Support\Facades\File;

class LicenseService
{
    // ⚠️ يجب تغيير هذا المفتاح السري إلى نص معقد لا يعرفه أحد غيرك
    private string $salt = 'PERFUMES_V2_LUXURY_SECRET_2026';

    public function getHardwareId(): string
    {
        static $cached = null;
        if ($cached !== null) {
            return $cached;
        }

        $cacheFile = storage_path('framework/hwid.key');
        if (File::exists($cacheFile)) {
            $cached = trim(File::get($cacheFile));
            if (!empty($cached)) {
                return $cached;
            }
        }

        $hwid = '';

        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            // Windows: فحص سريع لمعرف الجهاز
            $hwid = php_uname('n');
        } else {
            // Linux: الحصول على معرف الآلة
            if (File::exists('/etc/machine-id')) {
                $hwid = trim(File::get('/etc/machine-id'));
            } elseif (File::exists('/var/lib/dbus/machine-id')) {
                $hwid = trim(File::get('/var/lib/dbus/machine-id'));
            }
        }

        if (empty($hwid)) {
            $hwid = php_uname('n'); 
        }

        $cached = substr(strtoupper(hash('sha256', $hwid . 'DEVICE_ID_GENERATOR')), 0, 16);
        @File::put($cacheFile, $cached);

        return $cached;
    }

    public function generateLicenseKey(string $deviceId): string
    {
        // تقوم هذه الدالة بتوليد المفتاح النهائي بناءً على رمز الجهاز والكلمة السرية الخاصة بك
        $hash = strtoupper(hash('sha256', $deviceId . $this->salt));
        
        // تنسيق المفتاح ليصبح شكله هكذا: XXXX-XXXX-XXXX-XXXX
        return substr($hash, 0, 4) . '-' . substr($hash, 4, 4) . '-' . substr($hash, 8, 4) . '-' . substr($hash, 12, 4);
    }

    public function isLicensed(): bool
    {
        // ملف حفظ التفعيل داخل storage
        $licenseFile = storage_path('app/license.json');
        
        if (!File::exists($licenseFile)) {
            return false;
        }

        $data = json_decode(File::get($licenseFile), true);
        
        if (!$data || empty($data['key'])) {
            return false;
        }

        // حساب المفتاح الصحيح للجهاز الحالي
        $deviceId = $this->getHardwareId();
        $expectedKey = $this->generateLicenseKey($deviceId);

        // التحقق من أن المفتاح المحفوظ يتطابق مع المفتاح الصحيح
        return hash_equals($expectedKey, $data['key']);
    }

    public function activate(string $key): bool
    {
        $deviceId = $this->getHardwareId();
        $expectedKey = $this->generateLicenseKey($deviceId);

        if (hash_equals($expectedKey, $key)) {
            // حفظ التفعيل
            File::put(storage_path('app/license.json'), json_encode([
                'key' => $key,
                'device_id' => $deviceId,
                'activated_at' => now()->toDateTimeString(),
            ]));
            return true;
        }

        return false;
    }

    public function deactivate(): bool
    {
        $licenseFile = storage_path('app/license.json');
        if (File::exists($licenseFile)) {
            File::delete($licenseFile);
            return true;
        }
        return false;
    }
}
