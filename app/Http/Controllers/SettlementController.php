<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\PaymentMethod;
use App\Models\Settlement;
use App\Repositories\Contracts\SettlementRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettlementController extends Controller
{
    public function __construct(private SettlementRepositoryInterface $settlements) {}

    public function index(): Response
    {
        return Inertia::render('Settlements/Index', [
            'settlements'    => $this->settlements->paginated(30),
            'customers'      => Customer::withoutCash()->orderBy('name')->get(['id', 'name', 'total_debt']),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(int $id): Response
    {
        $settlement = Settlement::with(['customer', 'invoice', 'invoiceReturn', 'paymentMethod'])->findOrFail($id);

        return Inertia::render('Settlements/Show', [
            'settlement' => $settlement,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'customer_id'       => 'required|exists:customers,id',
            'invoice_id'        => 'nullable|exists:invoices,id',
            'invoice_return_id' => 'nullable|exists:invoice_returns,id',
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount'            => 'required|numeric|min:0.01',
            'notes'             => 'nullable|string',
        ]);

        Settlement::create([
            'customer_id'       => $data['customer_id'],
            'invoice_id'        => $data['invoice_id'] ?? null,
            'invoice_return_id' => $data['invoice_return_id'] ?? null,
            'payment_method_id' => $data['payment_method_id'],
            'amount'            => $data['amount'],
            'notes'             => $data['notes'] ?? null,
            'created_at'        => now(),
        ]);

        $redirectTo = $data['invoice_id']
            ? redirect()->route('invoices.show', $data['invoice_id'])
            : back();

        return $redirectTo->with('success', 'تم تسجيل التسوية بنجاح');
    }

    public function destroy(int $id): RedirectResponse
    {
        $settlement = Settlement::findOrFail($id);
        $invoiceId  = $settlement->invoice_id;
        $settlement->delete();

        return ($invoiceId ? redirect()->route('invoices.show', $invoiceId) : back())
            ->with('success', 'تم حذف التسوية بنجاح');
    }
}
