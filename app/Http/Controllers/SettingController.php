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
            'label_width_mm' => 'nullable|numeric|min:10|max:300',
            'label_height_mm' => 'nullable|numeric|min:10|max:300',
            'label_margin_mm' => 'nullable|numeric|min:0|max:50',
            'label_orientation' => 'nullable|string|in:landscape,portrait',
            'label_barcode_type' => 'nullable|string|in:qr_2d,qr_3d,imei,serial',
            'label_show_store_name' => 'nullable|string|in:0,1',
            'label_show_price' => 'nullable|string|in:0,1',
            'label_show_code_text' => 'nullable|string|in:0,1',
            'label_font_size' => 'nullable|string|max:10',
        ]);

        if ($request->hasFile('store_logo_file')) {
            $this->settingRepo->updateReceiptLogo($request->file('store_logo_file'));
        }

        $fields = [
            'store_name',
            'store_subname',
            'store_details',
            'thank_you_message',
            'policy_notes',
            'receipt_font_size',
            'show_qr_code',
            'node_printer_name',
            'label_width_mm',
            'label_height_mm',
            'label_margin_mm',
            'label_orientation',
            'label_barcode_type',
            'label_show_store_name',
            'label_show_price',
            'label_show_code_text',
            'label_font_size',
        ];

        foreach ($fields as $field) {
            if ($request->has($field)) {
                $this->settingRepo->set($field, $request->input($field));
            }
        }

        return redirect()->back()->with('success', 'تم حفظ الإعدادات بنجاح!');
    }
}
