<?php

namespace App\Services;

use Illuminate\Support\Facades\File;

class LicenseService
{
    // ⚠️ يجب تغيير هذا المفتاح السري إلى نص معقد لا يعرفه أحد غيرك
    private string $salt = 'PERFUMES_V2_LUXURY_SECRET_2026';

    public function getHardwareId(): string
    {
        $hwid = '';

        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            // Windows: الحصول على الرقم التسلسلي للوحة الأم
            exec('wmic baseboard get serialnumber 2>&1', $output);
            if (isset($output[1]) && !empty(trim($output[1]))) {
                $hwid = trim($output[1]);
            }
        } else {
            // Linux: الحصول على معرف الآلة
            if (File::exists('/etc/machine-id')) {
                $hwid = trim(File::get('/etc/machine-id'));
            } elseif (File::exists('/var/lib/dbus/machine-id')) {
                $hwid = trim(File::get('/var/lib/dbus/machine-id'));
            }
        }

        // في حال فشل الحصول على أي معلومات، نستخدم اسم الجهاز كبديل
        if (empty($hwid)) {
            $hwid = php_uname('n'); 
        }

        // إرجاع رمز جهاز مكون من 16 حرفاً ليتم عرضه للمستخدم
        return substr(strtoupper(hash('sha256', $hwid . 'DEVICE_ID_GENERATOR')), 0, 16);
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
}
