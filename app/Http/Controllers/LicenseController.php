<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\LicenseService;
use Illuminate\Support\Facades\Cache;

class LicenseController extends Controller
{
    public function __construct(private LicenseService $licenseService) {}

    public function index()
    {
        // إذا كان النظام مفعل، قم بتوجيهه للرئيسية
        if ($this->licenseService->isLicensed()) {
            return redirect('/');
        }

        return Inertia::render('License/Activation', [
            'deviceId' => $this->licenseService->getHardwareId(),
        ]);
    }

    public function activate(Request $request)
    {
        $request->validate([
            'key' => 'required|string',
        ]);

        $key = trim($request->input('key'));

        if ($this->licenseService->activate($key)) {
            // مسح الذاكرة المؤقتة بعد التفعيل ليعمل النظام فوراً
            Cache::forget('is_system_licensed');

            return redirect('/')->with('success', 'تم تفعيل النظام بنجاح!');
        }

        return back()->with('error', 'مفتاح التفعيل غير صحيح، يرجى التأكد والمحاولة مرة أخرى.');
    }
}
