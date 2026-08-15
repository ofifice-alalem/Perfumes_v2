<?php

namespace App\Repositories;

use App\Models\Setting;
use App\Repositories\Contracts\SettingRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class SettingRepository extends Repository implements SettingRepositoryInterface
{
    public function model(): string
    {
        return Setting::class;
    }

    public function get(string $key, ?string $default = null): ?string
    {
        return Setting::get($key, $default);
    }

    public function set(string $key, ?string $value): void
    {
        Setting::set($key, $value);
    }

    public function getAll(): array
    {
        return Setting::getAll();
    }

    public function updateReceiptLogo($file): string
    {
        $ext = $file->getClientOriginalExtension();
        $filename = 'logo_' . time() . '.' . $ext;

        $receiptDir = public_path('images/receipt');

        if (!file_exists($receiptDir)) {
            @mkdir($receiptDir, 0777, true);
        } else {
            $existingFiles = glob($receiptDir . '/*');
            if (is_array($existingFiles)) {
                foreach ($existingFiles as $existingFile) {
                    if (is_file($existingFile)) {
                        @unlink($existingFile);
                    }
                }
            }
        }

        $logoPath = '';

        try {
            if (is_writable($receiptDir) || @chmod($receiptDir, 0777)) {
                $file->move($receiptDir, $filename);
                $logoPath = '/images/receipt/' . $filename;
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to move logo to public/images/receipt: ' . $e->getMessage());
        }

        if (!$logoPath) {
            try {
                Storage::disk('public')->deleteDirectory('receipt_logos');
                Storage::disk('public')->makeDirectory('receipt_logos');

                $path = Storage::disk('public')->putFileAs('receipt_logos', $file, $filename);
                $logoPath = '/storage/' . $path;
            } catch (\Throwable $e) {
                Log::warning('Failed to store logo in public storage disk: ' . $e->getMessage());
            }
        }

        if (!$logoPath && $file->isValid()) {
            try {
                $mime = $file->getMimeType() ?: 'image/png';
                $logoPath = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($file->getRealPath()));
            } catch (\Throwable $e) {
                Log::error('Failed to convert logo to base64: ' . $e->getMessage());
            }
        }

        if ($logoPath) {
            $this->set('store_logo', $logoPath);
        }

        return $logoPath;
    }
}
