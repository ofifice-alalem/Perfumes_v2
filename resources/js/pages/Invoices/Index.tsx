import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Plus, Eye, Trash2, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface Invoice {
  id: number;
  customer_type: 'regular' | 'vip';
  total: string;
  paid_amount: string;
  due_amount: string;
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes: string | null;
  created_at: string;
  user: { name: string };
  customer: { id: number; name: string } | null;
  items: { id: number }[];
}

interface Props {
  invoices: Invoice[];
  flash?: { success?: string; error?: string };
}

const statusConfig = {
  paid:    { label: 'مدفوعة',       bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
  partial: { label: 'جزئي',         bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
  unpaid:  { label: 'غير مدفوعة',   bg: 'bg-red-500/10 text-red-500 border border-red-500/20' },
};

const tabs = ['الكل', 'مدفوعة', 'جزئي', 'غير مدفوعة'];
const tabMap: Record<string, string> = { 'مدفوعة': 'paid', 'جزئي': 'partial', 'غير مدفوعة': 'unpaid' };

export default function InvoicesIndex({ invoices, flash }: Props) {
  const [activeTab, setActiveTab]   = useState('الكل');
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState('');

  const filtered = invoices.filter(inv => {
    if (activeTab !== 'الكل' && inv.payment_status !== tabMap[activeTab]) return false;
    if (filterCustomer && !inv.customer?.name.toLowerCase().includes(filterCustomer.toLowerCase())) return false;
    return true;
  });

  function deleteInvoice(id: number) {
    router.delete(`/invoices/${id}`, { onSuccess: () => setDeleteId(null) });
  }

  const FilterPanel = () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">اسم العميل</label>
        <input value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}
          placeholder="بحث..." className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
      </div>
      <button onClick={() => setFilterCustomer('')}
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
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">{invoices.length} فاتورة</p>
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
              <FilterPanel />
            </div>
          )}
        </div>

        {/* Main Layout */}
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
              {tabs.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
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
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-3">
                <span className="text-4xl">🧾</span>
                <span className="font-bold">لا توجد فواتير</span>
              </div>
            ) : (
              filtered.map(inv => (
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
                      <div className="flex items-center gap-2">
                        <Link href={`/invoices/${inv.id}`}
                          className="flex items-center gap-1.5 px-3 h-9 rounded-[12px] bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white border border-black/10 dark:border-white/10 hover:border-primary text-slate-600 dark:text-white/60 font-bold text-[13px] transition-all">
                          <Eye className="w-3.5 h-3.5" /> تفاصيل
                        </Link>
                        <button onClick={() => setDeleteId(inv.id)}
                          className="w-9 h-9 rounded-[12px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 flex items-center justify-center transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Filter */}
          <div className="hidden lg:block w-[280px] shrink-0">
            <SpatialCard title="فلترة" icon={<SlidersHorizontal className="w-4 h-4" />}>
              <FilterPanel />
            </SpatialCard>
          </div>
        </div>

        <ConfirmModal isOpen={deleteId !== null} onConfirm={() => deleteId && deleteInvoice(deleteId)} onCancel={() => setDeleteId(null)} />

      </div>
    </AppShell>
  );
}
