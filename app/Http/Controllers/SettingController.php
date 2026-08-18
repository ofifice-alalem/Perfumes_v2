<?php

namespace App\Http\Controllers;

use App\Repositories\Contracts\SettingRepositoryInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    protected SettingRepositoryInterface $settingRepo;

    public function __construct(SettingRepositoryInterface $settingRepo)
    {
        $this->settingRepo = $settingRepo;
    }

    public function index(): Response
    {
        $settings = $this->settingRepo->getAll();

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
            'receipt_font_size' => 'nullable|string|max:10',
            'show_qr_code' => 'nullable|string|in:0,1',
            'store_logo_file' => 'nullable|image|mimes:jpeg,png,jpg,webp,svg|max:4096',
        ]);

        if ($request->hasFile('store_logo_file')) {
            $this->settingRepo->updateReceiptLogo($request->file('store_logo_file'));
        }

        if ($request->has('store_name')) {
            $this->settingRepo->set('store_name', $request->input('store_name'));
        }
        if ($request->has('store_subname')) {
            $this->settingRepo->set('store_subname', $request->input('store_subname'));
        }
        if ($request->has('store_details')) {
            $this->settingRepo->set('store_details', $request->input('store_details'));
        }
        if ($request->has('thank_you_message')) {
            $this->settingRepo->set('thank_you_message', $request->input('thank_you_message'));
        }
        if ($request->has('policy_notes')) {
            $this->settingRepo->set('policy_notes', $request->input('policy_notes'));
        }
        if ($request->has('receipt_font_size')) {
            $this->settingRepo->set('receipt_font_size', $request->input('receipt_font_size'));
        }
        if ($request->has('show_qr_code')) {
            $this->settingRepo->set('show_qr_code', $request->input('show_qr_code'));
        }
        if ($request->has('node_printer_name')) {
            $this->settingRepo->set('node_printer_name', $request->input('node_printer_name'));
        }

        return redirect()->back()->with('success', 'تم حفظ إعدادات المحل والفاتورة بنجاح!');
    }
}
