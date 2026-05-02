<?php

namespace App\Http\Controllers;

use App\Repositories\Contracts\CustomerRepositoryInterface;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function __construct(private CustomerRepositoryInterface $customers) {}

    public function index(): Response
    {
        return Inertia::render('Customers/Index', [
            'customers'      => $this->customers->allOrdered(),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'phone'   => 'nullable|string|max:20|unique:customers,phone',
            'email'   => 'nullable|email|unique:customers,email',
            'address' => 'nullable|string',
        ]);

        $this->customers->create($data);

        return back()->with('success', 'تم إضافة العميل بنجاح');
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name'      => 'required|string|max:255',
            'phone'     => 'nullable|string|max:20|unique:customers,phone,' . $id,
            'email'     => 'nullable|email|unique:customers,email,' . $id,
            'address'   => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $this->customers->update($id, $data);

        return back()->with('success', 'تم تحديث العميل بنجاح');
    }

    public function destroy(int $id)
    {
        if ($id === 1) {
            return back()->with('error', 'لا يمكن حذف زبون نقدي');
        }

        if ($this->customers->hasInvoices($id)) {
            return back()->with('error', 'لا يمكن حذف عميل مرتبط بفواتير');
        }

        $this->customers->delete($id);

        return back()->with('success', 'تم حذف العميل بنجاح');
    }
}
