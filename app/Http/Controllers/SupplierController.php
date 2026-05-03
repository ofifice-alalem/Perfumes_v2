<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use App\Repositories\Contracts\SupplierRepositoryInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function __construct(private SupplierRepositoryInterface $suppliers) {}

    public function index(): Response
    {
        return Inertia::render('Suppliers/Index', [
            'suppliers'      => $this->suppliers->allOrdered(),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'phone'   => 'required|string|max:20|unique:suppliers,phone',
            'email'   => 'nullable|email|max:255',
            'address' => 'nullable|string',
        ]);

        $this->suppliers->create($data);

        return back()->with('success', 'تم إضافة المورد بنجاح');
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name'      => 'required|string|max:255',
            'phone'     => "required|string|max:20|unique:suppliers,phone,{$id}",
            'email'     => 'nullable|email|max:255',
            'address'   => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $this->suppliers->update($id, $data);

        return back()->with('success', 'تم تحديث المورد');
    }

    public function destroy(int $id)
    {
        if ($this->suppliers->hasPurchases($id)) {
            return back()->with('error', 'لا يمكن حذف مورد مرتبط بفواتير شراء');
        }

        $this->suppliers->delete($id);

        return back()->with('success', 'تم حذف المورد');
    }
}
