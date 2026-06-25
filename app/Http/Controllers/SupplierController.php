<?php

namespace App\Http\Controllers;

use App\Http\Requests\SupplierRequest;
use App\Repositories\Contracts\SupplierRepositoryInterface;
use Illuminate\Http\RedirectResponse;
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

    public function store(SupplierRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['is_active'] = $request->boolean('is_active', true);

        $this->suppliers->create($data);

        return back()->with('success', 'تم إضافة المورد بنجاح');
    }

    public function update(SupplierRequest $request, int $id): RedirectResponse
    {
        if ($id === 1) {
            return back()->with('error', 'لا يمكن تعديل المورد النقدي');
        }

        $data = $request->validated();
        $data['is_active'] = $request->boolean('is_active', true);

        $this->suppliers->update($data, $id);

        return back()->with('success', 'تم تحديث المورد بنجاح');
    }

}
