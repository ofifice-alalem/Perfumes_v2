<?php

namespace App\Http\Controllers;

use App\Repositories\Contracts\SizeRepositoryInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SizeController extends Controller
{
    public function __construct(private SizeRepositoryInterface $sizes) {}

    public function index(): Response
    {
        return Inertia::render('Sizes/Index', [
            'sizes' => $this->sizes->allOrdered(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'label' => 'required|string|max:50|unique:sizes,label',
            'value' => 'required|numeric|min:0.01',
        ]);

        $data['unit'] = 'ml';

        $this->sizes->create($data);

        return back()->with('success', 'تم إضافة الحجم بنجاح');
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'label' => 'required|string|max:50|unique:sizes,label,' . $id,
            'value' => 'required|numeric|min:0.01',
        ]);

        $data['unit'] = 'ml';

        $this->sizes->update($data, $id);

        return back()->with('success', 'تم تحديث الحجم بنجاح');
    }

    public function destroy(int $id)
    {
        $this->sizes->delete($id);

        return back()->with('success', 'تم حذف الحجم بنجاح');
    }
}
