<?php

namespace App\Repositories;

use App\Models\Invoice;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class InvoiceRepository extends Repository implements InvoiceRepositoryInterface
{
    public function model(): string
    {
        return Invoice::class;
    }

    public function paginated(int $perPage = 20)
    {
        $periodId = app(\App\Services\RolloverService::class)->getCurrentPeriodId();
        $tab = request()->input('filter.tab', 'active');

        $query = $this->model->where('period_id', $periodId)
            ->with(['customer', 'user'])
            ->withSum('payments as paid_amount_sum', 'amount')
            ->withSum('settlements as settlements_total', 'amount');

        if ($tab === 'deleted') {
            $query->onlyTrashed();
        } else {
            $query->withoutTrashed();
        }

        return QueryBuilder::for($query)
            ->allowedFilters(
                AllowedFilter::callback('tab', fn($q, $v) => $v === 'deleted' ? $q->onlyTrashed() : $q->withoutTrashed()),
                AllowedFilter::callback('id', fn($q, $v) => $q->where(fn($sub) => $sub->where('id', $v)->orWhere('invoice_number', $v))),
                AllowedFilter::exact('invoice_number'),
                AllowedFilter::exact('customer_id'),
                AllowedFilter::exact('user_id'),
                AllowedFilter::exact('payment_status'),
                AllowedFilter::callback('date_from',    fn($q, $v) => $q->whereDate('created_at', '>=', $v)),
                AllowedFilter::callback('date_to',      fn($q, $v) => $q->whereDate('created_at', '<=', $v)),
                AllowedFilter::callback('amount_from',  fn($q, $v) => $q->where('total', '>=', $v)),
                AllowedFilter::callback('amount_to',    fn($q, $v) => $q->where('total', '<=', $v)),
                AllowedFilter::callback('product_id',   fn($q, $v) => $q->whereHas('items', fn($q) => $q->where('product_id', $v))),
                AllowedFilter::callback('payment_method_id', fn($q, $v) =>
                    $v === 'hybrid'
                        ? $q->whereHas('payments', fn($q) => $q->select('invoice_id')
                            ->groupBy('invoice_id')
                            ->havingRaw('COUNT(DISTINCT payment_method_id) > 1'))
                        : $q->whereHas('payments', fn($q) => $q->where('payment_method_id', $v))
                             ->whereDoesntHave('payments', fn($q) => $q->where('payment_method_id', '!=', $v))
                ),
            )
            ->allowedSorts('created_at', 'total', 'payment_status')
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->withQueryString();
    }

    public function getStatusCounts(): array
    {
        $periodId = app(\App\Services\RolloverService::class)->getCurrentPeriodId();
        $base = $this->model->where('period_id', $periodId);

        return [
            'active'  => (clone $base)->withoutTrashed()->count(),
            'deleted' => (clone $base)->onlyTrashed()->count(),
        ];
    }

    public function findWithRelations(int $id)
    {
        return $this->model
            ->withTrashed()
            ->with([
                'customer',
                'user',
                'items.product',
                'items.size',
                'payments.paymentMethod',
                'payments.user',
                'settlements.paymentMethod',
                'settlements.user',
                'returns.items.product',
                'returns.settlement',
            ])
            ->findOrFail($id);
    }

    public function createWithItems(array $invoiceData, array $itemsData, array $paymentsData, ?array $debtPaymentData): Invoice
    {
        $invoice = $this->model->create($invoiceData);

        foreach ($itemsData as $item) {
            \App\Models\InvoiceItem::create(array_merge($item, ['invoice_id' => $invoice->id]));
        }

        foreach ($paymentsData as $payment) {
            \App\Models\Payment::create(array_merge($payment, ['invoice_id' => $invoice->id]));
        }

        if (!empty($debtPaymentData)) {
            \App\Models\Payment::create($debtPaymentData);
        }

        return $invoice;
    }

    public function getRecentInvoicesFormatted(int $limit = 4): array
    {
        $recentInvoices = \Illuminate\Support\Facades\DB::select("
            SELECT 
                i.id,
                i.invoice_number,
                COALESCE(c.name, 'زبون نقدي') as customer_name,
                COALESCE(u.name, 'الكاشير') as user_name,
                CAST(i.total AS DOUBLE) as total,
                CAST(i.paid_amount AS DOUBLE) as paid_amount,
                DATE_FORMAT(i.created_at, '%Y-%m-%d %h:%i %p') as created_at
            FROM invoices i
            LEFT JOIN customers c ON c.id = i.customer_id
            LEFT JOIN users u ON u.id = i.user_id
            WHERE i.deleted_at IS NULL
            ORDER BY i.id DESC
            LIMIT ?
        ", [$limit]);

        $invoiceIds = array_column($recentInvoices, 'id');
        if (empty($invoiceIds)) {
            return [];
        }

        $items = \Illuminate\Support\Facades\DB::table('invoice_items as ii')
            ->leftJoin('products as p', 'p.id', '=', 'ii.product_id')
            ->leftJoin('sizes as s', 's.id', '=', 'ii.size_id')
            ->whereIn('ii.invoice_id', $invoiceIds)
            ->select('ii.invoice_id', 'p.name as product_name', 's.label as size_label')
            ->get()
            ->groupBy('invoice_id');

        return array_map(function($inv) use ($items) {
            $invItems = $items->get($inv->id, collect());
            $inv->items_count = $invItems->count();
            $inv->items_summary = $invItems->take(2)->map(fn($it) => ($it->product_name ?? 'منتج') . ($it->size_label ? " ({$it->size_label})" : ''))->join('، ');
            return (array)$inv;
        }, $recentInvoices);
    }

    public function getPosCatalog(): array
    {
        $catalog = \Illuminate\Support\Facades\Cache::get('pos_products_catalog_base');

        if (empty($catalog)) {
            $catalog = \App\Models\Product::with([
                'category:id,name,unit,is_operational',
                'priceTier:id,name',
                'priceTier.tierPrices:id,tier_id,size_id,price_regular,price_vip',
                'priceTier.tierPrices.size:id,label,value,unit',
                'productPrice:id,product_id,price_per_unit_regular,price_per_unit_vip,full_bottle_regular,full_bottle_vip',
                'originalPerfumeDetail:id,product_id,bottle_volume',
            ])
            ->whereHas('category', fn($q) => $q->where('is_operational', false))
            ->orderBy('name')
            ->get(['id', 'name', 'category_id', 'price_tier_id', 'selling_type', 'qrcode'])
            ->toArray();

            if (!empty($catalog)) {
                \Illuminate\Support\Facades\Cache::put('pos_products_catalog_base', $catalog, 86400);
            }
        }

        if (empty($catalog)) {
            return [];
        }

        // Targeted stock pluck only for the catalog products
        $catalogIds = array_column($catalog, 'id');
        $liveStocks = \App\Models\Product::whereIn('id', $catalogIds)->pluck('stock', 'id');
        foreach ($catalog as &$p) {
            $p['stock'] = (string)($liveStocks[$p['id']] ?? 0);
        }
        unset($p);

        return $catalog;
    }
}
