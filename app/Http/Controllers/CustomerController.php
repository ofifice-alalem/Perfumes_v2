<?php

namespace App\Http\Controllers;

use App\Http\Requests\CustomerRequest;
use App\Repositories\Contracts\CustomerRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function __construct(private CustomerRepositoryInterface $customers) {}

    public function index(): Response
    {
        return Inertia::render('Customers/Index', [
            'customers' => $this->customers->allOrdered(),
        ]);
    }

    public function store(CustomerRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['is_active'] = $request->boolean('is_active', true);

        $this->customers->create($data);

        return back()->with('success', 'تم إضافة العميل بنجاح');
    }

    public function update(CustomerRequest $request, int $id): RedirectResponse
    {
        if ($id === 1) {
            return back()->with('error', 'لا يمكن تعديل الزبون النقدي');
        }

        $data = $request->validated();
        $data['is_active'] = $request->boolean('is_active', true);

        $this->customers->update($data, $id);

        return back()->with('success', 'تم تحديث العميل بنجاح');
    }

}
