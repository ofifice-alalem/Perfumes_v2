<?php

namespace App\Http\Controllers;

use App\Repositories\Contracts\SettingRepositoryInterface;
use App\Repositories\Contracts\ProductRepositoryInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    protected SettingRepositoryInterface $settingRepo;
    protected ProductRepositoryInterface $productRepo;

    public function __construct(
        SettingRepositoryInterface $settingRepo,
        ProductRepositoryInterface $productRepo
    ) {
        $this->settingRepo = $settingRepo;
        $this->productRepo = $productRepo;
    }

    public function index(): Response
    {
        $settings = $this->settingRepo->getAll();
        $products = $this->productRepo->allWithRelations();

        return Inertia::render('Settings/Index', [
            'settings' => $settings,
            'products' => $products,
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
            'label_zoom' => 'nullable|string|max:10',
            'label_rotation' => 'nullable|string|in:0,90,180,270',
            'label_printer_name' => 'nullable|string|max:255',
            'label_default_tab' => 'nullable|string|in:ean13,serial,classic',
            'label_qr_size' => 'nullable|numeric|min:5|max:60',
            'label_title_font_size' => 'nullable|numeric|min:4|max:30',
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
            'label_printer_name',
            'label_default_tab',
            'label_width_mm',
            'label_height_mm',
            'label_margin_mm',
            'label_orientation',
            'label_barcode_type',
            'label_show_store_name',
            'label_show_price',
            'label_show_code_text',
            'label_font_size',
            'label_zoom',
            'label_rotation',
            'label_qr_size',
            'label_title_font_size',
        ];

        foreach ($fields as $field) {
            if ($request->has($field)) {
                $this->settingRepo->set($field, $request->input($field));
            }
        }

        return redirect()->back()->with('success', 'تم حفظ الإعدادات بنجاح!');
    }
}
