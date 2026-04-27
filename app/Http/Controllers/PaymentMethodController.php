<?php

namespace App\Http\Controllers;

use App\Repositories\Contracts\PaymentMethodRepositoryInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentMethodController extends Controller
{
    public function __construct(private PaymentMethodRepositoryInterface $methods) {}

    public function index(): Response
    {
        return Inertia::render('PaymentMethods/Index', [
            'methods' => $this->methods->allOrdered(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:50|unique:payment_methods,name',
        ]);

        $this->methods->create($data);

        return back()->with('success', 'تم إضافة وسيلة الدفع بنجاح');
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name'      => 'required|string|max:50|unique:payment_methods,name,' . $id,
            'is_active' => 'boolean',
        ]);

        $this->methods->update($id, $data);

        return back()->with('success', 'تم تحديث وسيلة الدفع بنجاح');
    }

    public function destroy(int $id)
    {
        if ($this->methods->isUsed($id)) {
            return back()->with('error', 'لا يمكن حذف وسيلة دفع مستخدمة في معاملات');
        }

        $this->methods->delete($id);

        return back()->with('success', 'تم حذف وسيلة الدفع بنجاح');
    }
}
