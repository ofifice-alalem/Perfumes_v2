<?php

namespace App\Http\Controllers;

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
            'suppliers' => $this->suppliers->allOrdered(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:suppliers,phone',
            'email' => 'nullable|email|max:255|unique:suppliers,email',
            'address' => 'nullable|string',
        ]);

        $data['is_active'] = true;
        $data['total_purchases'] = 0;
        $data['total_debt'] = 0;

        $this->suppliers->create($data);

        return back()->with('success', 'تم إضافة المورد بنجاح');
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:suppliers,phone,' . $id,
            'email' => 'nullable|email|max:255|unique:suppliers,email,' . $id,
            'address' => 'nullable|string',
            'is_active' => 'required|boolean',
        ]);

        $this->suppliers->update($id, $data);

        return back()->with('success', 'تم تحديث المورد بنجاح');
    }

    public function destroy(int $id)
    {
        if ($this->suppliers->hasPurchases($id)) {
            return back()->with('error', 'لا يمكن حذف مورد مرتبط بمشتريات');
        }

        $this->suppliers->delete($id);

        return back()->with('success', 'تم حذف المورد بنجاح');
    }
}