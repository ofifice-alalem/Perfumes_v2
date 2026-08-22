<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceReturn;
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
        $todayStats = Invoice::whereDate('created_at', $today)
            ->selectRaw('COALESCE(SUM(total), 0) as sales, COALESCE(SUM(paid_amount), 0) as received, COALESCE(SUM(due_amount), 0) as due, COUNT(*) as count')
            ->first();
        $todaySales    = (float) $todayStats->sales;
        $todayReceived = (float) $todayStats->received;
        $todayDue      = (float) $todayStats->due;
        $todayCount    = (int) $todayStats->count;

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
        $monthStats = Invoice::whereBetween('created_at', [$monthStart . ' 00:00:00', $monthEnd . ' 23:59:59'])
            ->selectRaw('COALESCE(SUM(total), 0) as sales, COALESCE(SUM(paid_amount), 0) as received, COALESCE(SUM(due_amount), 0) as due')
            ->first();
        $monthSales     = (float) $monthStats->sales;
        $monthReceived  = (float) $monthStats->received;
        $monthDue       = (float) $monthStats->due;

        // المشتريات هذا الشهر
        $monthPurchStats = Purchase::whereBetween('created_at', [$monthStart . ' 00:00:00', $monthEnd . ' 23:59:59'])
            ->selectRaw('COALESCE(SUM(total), 0) as total, COALESCE(SUM(paid_amount), 0) as paid, COALESCE(SUM(due_amount), 0) as due')
            ->first();
        $monthPurchTotal   = (float) $monthPurchStats->total;
        $monthPurchPaid    = (float) $monthPurchStats->paid;
        $monthPurchDue     = (float) $monthPurchStats->due;

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

        // ── إحصائيات الأيام السابقة من هذا الشهر ──────────────────────────────
        $dayOfMonth = now()->day;

        // مبيعات (فواتير) مجمّعة يومياً من أول الشهر حتى اليوم
        $dailyInvoices = Invoice::selectRaw('DATE(created_at) as day, SUM(total) as sales, SUM(paid_amount) as received, SUM(due_amount) as due, COUNT(*) as count')
            ->whereBetween('created_at', [$monthStart . ' 00:00:00', $today . ' 23:59:59'])
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->keyBy('day');

        // مرتجعات مجمّعة يومياً من أول الشهر حتى اليوم
        $dailyReturns = InvoiceReturn::selectRaw('DATE(created_at) as day, SUM(total) as returns_total')
            ->whereBetween('created_at', [$monthStart . ' 00:00:00', $today . ' 23:59:59'])
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->keyBy('day');

        // دمج البيانات في مصفوفة لكل يوم من 1 إلى اليوم الحالي
        $dailyStats = [];
        $monthYear = now()->format('Y-m');
        for ($d = 1; $d <= $dayOfMonth; $d++) {
            $dateKey = $monthYear . '-' . str_pad($d, 2, '0', STR_PAD_LEFT);
            $inv  = $dailyInvoices->get($dateKey);
            $ret  = $dailyReturns->get($dateKey);
            $dailyStats[] = [
                'day'     => $d,
                'date'    => $dateKey,
                'sales'   => round((float)($inv?->sales    ?? 0), 2),
                'received'=> round((float)($inv?->received ?? 0), 2),
                'due'     => round((float)($inv?->due      ?? 0), 2),
                'returns' => round((float)($ret?->returns_total ?? 0), 2),
                'count'   => (int)($inv?->count ?? 0),
            ];
        }

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
            'daily_stats'     => $dailyStats,
        ]);
    }
}
