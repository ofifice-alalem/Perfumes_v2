<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;

class SettingController extends Controller
{
    public function index(): Response
    {
        $settings = Setting::getAll();

        return Inertia::render('Settings/Index', [
            'settings' => $settings,
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'store_name' => 'nullable|string|max:255',
            'store_subname' => 'nullable|string|max:255',
            'store_details' => 'nullable|string',
            'thank_you_message' => 'nullable|string',
            'policy_notes' => 'nullable|string',
            'store_logo_file' => 'nullable|image|mimes:jpeg,png,jpg,webp,svg|max:4096',
        ]);

        if ($request->hasFile('store_logo_file')) {
            $file = $request->file('store_logo_file');
            $ext = $file->getClientOriginalExtension();
            $filename = 'logo_' . time() . '.' . $ext;

            // Dedicated directory specifically for receipt/invoice logos
            $receiptDir = public_path('images/receipt');

            // 1. Ensure directory exists & PURGE old receipt images before saving new one
            if (!file_exists($receiptDir)) {
                @mkdir($receiptDir, 0777, true);
            } else {
                // Clear all previous files in dedicated receipt directory
                $existingFiles = glob($receiptDir . '/*');
                if (is_array($existingFiles)) {
                    foreach ($existingFiles as $existingFile) {
                        if (is_file($existingFile)) {
                            @unlink($existingFile);
                        }
                    }
                }
            }

            $saved = false;

            // Attempt 1: Move file to dedicated public/images/receipt directory
            try {
                if (is_writable($receiptDir) || @chmod($receiptDir, 0777)) {
                    $file->move($receiptDir, $filename);
                    Setting::set('store_logo', '/images/receipt/' . $filename);
                    $saved = true;
                }
            } catch (\Throwable $e) {
                Log::warning('Failed to move logo to public/images/receipt: ' . $e->getMessage());
            }

            // Attempt 2: Fallback to dedicated storage disk (storage/app/public/receipt_logos)
            if (!$saved) {
                try {
                    // Purge storage directory
                    Storage::disk('public')->deleteDirectory('receipt_logos');
                    Storage::disk('public')->makeDirectory('receipt_logos');

                    $path = Storage::disk('public')->putFileAs('receipt_logos', $file, $filename);
                    Setting::set('store_logo', '/storage/' . $path);
                    $saved = true;
                } catch (\Throwable $e) {
                    Log::warning('Failed to store logo in public storage disk: ' . $e->getMessage());
                }
            }

            // Attempt 3: Last-resort fallback to Base64 data URI directly in DB
            if (!$saved && $file->isValid()) {
                try {
                    $mime = $file->getMimeType() ?: 'image/png';
                    $base64 = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($file->getRealPath()));
                    Setting::set('store_logo', $base64);
                    $saved = true;
                } catch (\Throwable $e) {
                    Log::error('Failed to convert logo to base64: ' . $e->getMessage());
                }
            }
        }

        if ($request->has('store_name')) {
            Setting::set('store_name', $request->input('store_name'));
        }
        if ($request->has('store_subname')) {
            Setting::set('store_subname', $request->input('store_subname'));
        }
        if ($request->has('store_details')) {
            Setting::set('store_details', $request->input('store_details'));
        }
        if ($request->has('thank_you_message')) {
            Setting::set('thank_you_message', $request->input('thank_you_message'));
        }
        if ($request->has('policy_notes')) {
            Setting::set('policy_notes', $request->input('policy_notes'));
        }

        return redirect()->back()->with('success', 'تم حفظ إعدادات المحل والفاتورة بنجاح!');
    }
}
