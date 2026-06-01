<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Purchase;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Customer;
use App\Models\WasteLog;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $today     = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd   = now()->endOfMonth()->toDateString();

        // ── اليوم ────────────────────────────────────────────────────────────
        $todayInvoices = Invoice::whereDate('created_at', $today)->get();
        $todaySales    = $todayInvoices->sum('total');
        $todayReceived = $todayInvoices->sum('paid_amount');
        $todayDue      = $todayInvoices->sum('due_amount');
        $todayCount    = $todayInvoices->count();

        // آخر 5 فواتير اليوم مع اسم العميل
        $recentInvoices = Invoice::with('customer:id,name')
            ->whereDate('created_at', $today)
            ->latest()
            ->take(5)
            ->get()
            ->map(fn($inv) => [
                'id'          => $inv->id,
                'customer'    => $inv->customer?->name ?? 'زبون نقدي',
                'total'       => (float) $inv->total,
                'paid'        => (float) $inv->paid_amount,
                'status'      => $inv->payment_status,
                'created_at'  => $inv->created_at->format('H:i'),
            ]);

        // ── هذا الشهر ────────────────────────────────────────────────────────
        $monthInvoices  = Invoice::whereBetween('created_at', [$monthStart, $monthEnd])->get();
        $monthSales     = $monthInvoices->sum('total');
        $monthReceived  = $monthInvoices->sum('paid_amount');
        $monthDue       = $monthInvoices->sum('due_amount');

        // المشتريات هذا الشهر
        $monthPurchases    = Purchase::whereBetween('created_at', [$monthStart, $monthEnd])->get();
        $monthPurchTotal   = $monthPurchases->sum('total');
        $monthPurchPaid    = $monthPurchases->sum('paid_amount');
        $monthPurchDue     = $monthPurchases->sum('due_amount');

        // خسائر (تالف) هذا الشهر — عدد العناصر التالفة
        $monthLossCount = DB::table('waste_items')
            ->join('waste_logs', 'waste_logs.id', '=', 'waste_items.waste_log_id')
            ->whereBetween('waste_logs.created_at', [$monthStart, $monthEnd])
            ->count();

        // ── ديون العملاء والموردين ────────────────────────────────────────────
        $totalCustomerDebt  = Customer::where('id', '!=', 1)->sum('total_debt');
        $totalSupplierDebt  = Supplier::sum('total_debt');

        // ── منتجات المخزون المنخفض ────────────────────────────────────────────
        $lowStockProducts = Product::whereColumn('stock', '<=', 'min_stock')
            ->where('min_stock', '>', 0)
            ->orderByRaw('stock / NULLIF(min_stock, 0) ASC')
            ->take(8)
            ->get(['id', 'name', 'stock', 'min_stock'])
            ->map(fn($p) => [
                'id'       => $p->id,
                'name'     => $p->name,
                'stock'    => (float) $p->stock,
                'min_stock'=> (float) $p->min_stock,
                'ratio'    => $p->min_stock > 0 ? round(($p->stock / $p->min_stock) * 100) : 0,
            ]);

        return Inertia::render('Dashboard', [
            'today' => [
                'sales'    => round($todaySales, 2),
                'received' => round($todayReceived, 2),
                'due'      => round($todayDue, 2),
                'count'    => $todayCount,
            ],
            'month' => [
                'sales'           => round($monthSales, 2),
                'received'        => round($monthReceived, 2),
                'due'             => round($monthDue, 2),
                'purchases_total' => round($monthPurchTotal, 2),
                'purchases_paid'  => round($monthPurchPaid, 2),
                'purchases_due'   => round($monthPurchDue, 2),
                'losses'          => (int)$monthLossCount,
            ],
            'debts' => [
                'customers' => round((float)$totalCustomerDebt, 2),
                'suppliers' => round((float)$totalSupplierDebt, 2),
            ],
            'recent_invoices' => $recentInvoices,
            'low_stock'       => $lowStockProducts,
        ]);
    }
}
