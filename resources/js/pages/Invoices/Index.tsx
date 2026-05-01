import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { DateInput } from '@/components/ui/DateInput';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Plus, Eye, Trash2, SlidersHorizontal, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Invoice {
  id: number;
  customer_type: 'regular' | 'vip';
  total: string;
  paid_amount: string;
  due_amount: string;
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes: string | null;
  created_at: string;
  user: { id: number; name: string };
  customer: { id: number; name: string } | null;
  items: { id: number }[];
}

interface Paginator {
  data: Invoice[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  links: { url: string | null; label: string; active: boolean }[];
}

interface Filters {
  status?: string;
  customer_id?: string;
  category_id?: string;
  seller_id?: string;
  date_from?: string;
  date_to?: string;
  price_min?: string;
  price_max?: string;
  product_ids?: string[];
}

interface Props {
  invoices: Paginator;
  categories: { id: number; name: string }[];
  sellers: { id: number; name: string }[];
  customers: { id: number; name: string }[];
  products: { id: number; name: string }[];
  filters: Filters;
  flash?: { success?: string; error?: string };
}

const statusConfig = {
  paid:    { label: 'مدفوعة',     bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
  partial: { label: 'جزئي',       bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
  unpaid:  { label: 'غير مدفوعة', bg: 'bg-red-500/10 text-red-500 border border-red-500/20' },
};

const tabs = ['الكل', 'مدفوعة', 'جزئي', 'غير مدفوعة'];
const tabToStatus: Record<string, string> = { 'مدفوعة': 'paid', 'جزئي': 'partial', 'غير مدفوعة': 'unpaid' };
const statusToTab: Record<string, string> = { paid: 'مدفوعة', partial: 'جزئي', unpaid: 'غير مدفوعة' };

const sc = 'spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold w-full';
const lb = 'text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest';

export default function InvoicesIndex({ invoices, categories, sellers, customers, products, filters, flash }: Props) {
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const [customerId, setCustomerId] = useState(filters.customer_id  ?? '');
  const [categoryId, setCategoryId] = useState(filters.category_id ?? '');
  const [sellerId,   setSellerId]   = useState(filters.seller_id   ?? '');
  const [dateFrom,   setDateFrom]   = useState(filters.date_from   ?? '');
  const [dateTo,     setDateTo]     = useState(filters.date_to     ?? '');
  const [priceMin,   setPriceMin]   = useState(filters.price_min   ?? '');
  const [priceMax,    setPriceMax]   = useState(filters.price_max   ?? '');
  const [productIds,  setProductIds] = useState<string[]>(filters.product_ids ?? []);

  const activeTab = filters.status ? (statusToTab[filters.status] ?? 'الكل') : 'الكل';

  function applyFilters() {
    const params: Record<string, any> = {};
    if (filters.status)  params.status      = filters.status;
    if (customerId)      params.customer_id  = customerId;
    if (categoryId)      params.category_id  = categoryId;
    if (sellerId)        params.seller_id    = sellerId;
    if (dateFrom)        params.date_from    = dateFrom;
    if (dateTo)          params.date_to      = dateTo;
    if (priceMin)        params.price_min    = priceMin;
    if (priceMax)        params.price_max    = priceMax;
    if (productIds.length > 0) params['product_ids[]'] = productIds;
    router.get('/invoices', params, { preserveState: true, replace: true });
  }

  function handleTabChange(tab: string) {
    const status = tabToStatus[tab] ?? '';
    const params: Record<string, string> = {};
    if (status) params.status = status;
    const f = { customer_id: customerId, category_id: categoryId, seller_id: sellerId, date_from: dateFrom, date_to: dateTo, price_min: priceMin, price_max: priceMax };
    Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
    router.get('/invoices', params, { preserveState: true, replace: true });
  }

  function resetFilters() {
    setCustomerId(''); setCategoryId(''); setSellerId('');
    setDateFrom(''); setDateTo(''); setPriceMin(''); setPriceMax(''); setProductIds([]);
    router.get('/invoices', {}, { preserveState: true, replace: true });
  }

  function goToPage(url: string | null) {
    if (!url) return;
    router.visit(url, { preserveState: true });
  }

  function deleteInvoice(id: number) {
    router.delete(`/invoices/${id}`, { onSuccess: () => setDeleteId(null) });
  }

  const filterContent = (
    <div className="flex flex-col gap-4">
      <ModernSelect
        label="اسم العميل"
        placeholder="الكل"
        defaultValue={customerId}
        options={[{ label: 'الكل', value: '' }, ...customers.map(c => ({ label: c.name, value: String(c.id) }))]}
        onSelect={v => setCustomerId(v)}
      />
      <ModernSelect
        label="التصنيف"
        placeholder="الكل"
        defaultValue={categoryId}
        options={[{ label: 'الكل', value: '' }, ...categories.map(c => ({ label: c.name, value: String(c.id) }))]}
        onSelect={v => setCategoryId(v)}
      />
      <ModernSelect
        label="البائع"
        placeholder="الكل"
        defaultValue={sellerId}
        options={[{ label: 'الكل', value: '' }, ...sellers.map(s => ({ label: s.name, value: String(s.id) }))]}
        onSelect={v => setSellerId(v)}
      />
      <MultiSelect
        label="المنتج"
        placeholder="الكل"
        options={products.map(p => ({ label: p.name, value: String(p.id) }))}
        selected={productIds}
        onChange={setProductIds}
      />
      <DateInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
      <DateInput label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
      <div className="flex gap-3">
        <div className="flex flex-col gap-2 flex-1">
          <label className={lb}>السعر من</label>
          <input type="number" min="0" value={priceMin} onChange={e => setPriceMin(e.target.value)}
            placeholder="0" className={sc} />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <label className={lb}>السعر إلى</label>
          <input type="number" min="0" value={priceMax} onChange={e => setPriceMax(e.target.value)}
            placeholder="∞" className={sc} />
        </div>
      </div>
      <button onClick={applyFilters}
        className="w-full h-11 rounded-[14px] spatial-button flex items-center justify-center gap-2 font-bold text-sm">
        <Search className="w-4 h-4" /> فلترة
      </button>
      <button onClick={resetFilters}
        className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
        إعادة تعيين
      </button>
    </div>
  );

  return (
    <AppShell pageTitle="Step 5 — الفواتير والبيع">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">الفواتير</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">{invoices.total} فاتورة</p>
          </div>
          <Link href="/invoices/create" className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
            <Plus className="w-4 h-4" /> فاتورة جديدة
          </Link>
        </div>

        {/* Flash */}
        {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
        {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

        {/* Mobile Filter */}
        <div className="lg:hidden">
          <button onClick={() => setFilterOpen(!filterOpen)}
            className="w-full flex items-center justify-between px-5 h-12 rounded-[18px] spatial-input font-bold text-[14px] text-slate-700 dark:text-white/70">
            <div className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> فلترة</div>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
          {filterOpen && (
            <div className="mt-3 spatial-card p-5 animate-in fade-in slide-in-from-top-2 duration-200">
              {filterContent}
            </div>
          )}
        </div>

        {/* Main Layout */}
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
              {tabs.map(tab => (
                <button key={tab} onClick={() => handleTabChange(tab)}
                  className={`px-4 h-9 rounded-[12px] font-bold text-[13px] transition-all border shrink-0 ${
                    activeTab === tab
                      ? 'bg-primary border-primary text-white'
                      : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-600 dark:text-white/60 hover:border-primary/30 hover:text-primary'
                  }`}>
                  {tab}
                </button>
              ))}
            </div>

            {/* List */}
            {invoices.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-3">
                <span className="text-4xl">🧾</span>
                <span className="font-bold">لا توجد فواتير</span>
              </div>
            ) : (
              invoices.data.map(inv => (
                <div key={inv.id} className="spatial-card overflow-hidden flex flex-col sm:flex-row sm:items-stretch">

                  {/* Status Strip */}
                  <div className={`flex sm:flex-col sm:w-28 shrink-0 items-center sm:justify-center justify-between px-4 py-3 sm:px-3 sm:py-0 border-b sm:border-b-0 sm:border-l border-black/5 dark:border-white/5 ${statusConfig[inv.payment_status].bg}`}>
                    <span className="text-[13px] font-black">{statusConfig[inv.payment_status].label}</span>
                    <span className="sm:hidden text-[13px] font-black text-primary">#{inv.id}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center min-w-0 px-4 py-3 gap-2 sm:gap-5">
                    <div className="hidden sm:flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[15px] font-black text-primary">#{inv.id}</span>
                        <span className="text-[12px] font-bold text-slate-500 dark:text-white/60 bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-[8px]">
                          {new Date(inv.created_at).toLocaleDateString('ar')}
                        </span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-[6px] ${inv.customer_type === 'vip' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                          {inv.customer_type === 'vip' ? 'VIP' : 'عادي'}
                        </span>
                      </div>
                      <span className="text-[14px] font-bold text-slate-600 dark:text-white/60 truncate">
                        {inv.customer?.name ?? 'زبون نقدي'} — {inv.user.name}
                      </span>
                    </div>

                    {/* Mobile */}
                    <span className="sm:hidden text-[12px] font-bold text-slate-500 dark:text-white/60 bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-[8px] self-start">
                      {new Date(inv.created_at).toLocaleDateString('ar')}
                    </span>
                    <span className="sm:hidden text-[15px] font-black text-slate-800 dark:text-white truncate">
                      {inv.customer?.name ?? 'زبون نقدي'}
                    </span>

                    {/* Meta + Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 mt-1 sm:mt-0 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="font-black text-slate-800 dark:text-white text-sm">{inv.total} د</span>
                        {+inv.due_amount > 0 && (
                          <span className="text-xs font-bold text-red-500">متبقي: {inv.due_amount}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Link href={`/invoices/${inv.id}`}
                          className="flex items-center gap-2 px-4 h-10 rounded-[12px] bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white border border-black/10 dark:border-white/10 hover:border-primary text-slate-600 dark:text-white/60 font-bold text-[13px] transition-all">
                          <Eye className="w-4 h-4" /> تفاصيل
                        </Link>
                        <button onClick={() => setDeleteId(inv.id)}
                          className="w-10 h-10 rounded-[12px] bg-red-500/15 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 flex items-center justify-center transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Pagination */}
            {invoices.last_page > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-slate-400 dark:text-white/40">
                  صفحة {invoices.current_page} من {invoices.last_page}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(invoices.links[0].url)}
                    disabled={invoices.current_page === 1}
                    className="w-9 h-9 rounded-[12px] spatial-input flex items-center justify-center text-slate-600 dark:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed hover:text-primary transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {invoices.links.slice(1, -1).map((link, i) => (
                    <button key={i}
                      onClick={() => goToPage(link.url)}
                      disabled={!link.url}
                      className={`w-9 h-9 rounded-[12px] font-bold text-[13px] transition-all border ${
                        link.active
                          ? 'bg-primary border-primary text-white'
                          : 'spatial-input border-black/10 dark:border-white/10 text-slate-600 dark:text-white/60 hover:text-primary hover:border-primary/30'
                      }`}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                  ))}
                  <button
                    onClick={() => goToPage(invoices.links[invoices.links.length - 1].url)}
                    disabled={invoices.current_page === invoices.last_page}
                    className="w-9 h-9 rounded-[12px] spatial-input flex items-center justify-center text-slate-600 dark:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed hover:text-primary transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Filter */}
          <div className="hidden lg:block w-[360px] shrink-0">
            <SpatialCard title="فلترة" icon={<SlidersHorizontal className="w-4 h-4" />}>
              {filterContent}
            </SpatialCard>
          </div>
        </div>

        <ConfirmModal isOpen={deleteId !== null} onConfirm={() => deleteId && deleteInvoice(deleteId)} onCancel={() => setDeleteId(null)} />

      </div>
    </AppShell>
  );
}
