import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Plus, Eye, Trash2, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface Purchase {
  id: number;
  total: string;
  paid_amount: string;
  due_amount: string;
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes: string | null;
  created_at: string;
  supplier: { id: number; name: string };
  items: { id: number }[];
}

interface Props {
  purchases: Purchase[];
  flash?: { success?: string; error?: string };
}

const statusConfig = {
  paid:    { label: 'مدفوعة',     bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
  partial: { label: 'جزئي',       bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
  unpaid:  { label: 'غير مدفوعة', bg: 'bg-red-500/10 text-red-500 border border-red-500/20' },
};

const tabs = ['الكل', 'مدفوعة', 'جزئي', 'غير مدفوعة'];
const tabMap: Record<string, string> = { 'مدفوعة': 'paid', 'جزئي': 'partial', 'غير مدفوعة': 'unpaid' };

export default function PurchasesIndex({ purchases, flash }: Props) {
  const [activeTab, setActiveTab]   = useState('الكل');
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSupplier, setFilterSupplier] = useState('');

  const filtered = purchases.filter(p => {
    if (activeTab !== 'الكل' && p.payment_status !== tabMap[activeTab]) return false;
    if (filterSupplier && !p.supplier.name.toLowerCase().includes(filterSupplier.toLowerCase())) return false;
    return true;
  });

  function deletePurchase(id: number) {
    router.delete(`/purchases/${id}`, { onSuccess: () => setDeleteId(null) });
  }

  const FilterPanel = () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">اسم المورد</label>
        <input value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}
          placeholder="بحث..." className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
      </div>
      <button onClick={() => setFilterSupplier('')}
        className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
        إعادة تعيين
      </button>
    </div>
  );

  return (
    <AppShell pageTitle="المشتريات">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">المشتريات</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">{purchases.length} فاتورة شراء</p>
          </div>
          <Link href="/purchases/create"
            className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
            <Plus className="w-4 h-4" /> فاتورة شراء جديدة
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
                <span className="text-4xl">📦</span>
                <span className="font-bold">لا توجد فواتير شراء</span>
              </div>
            ) : (
              filtered.map(p => (
                <div key={p.id} className="spatial-card overflow-hidden flex flex-col sm:flex-row sm:items-stretch">

                  {/* Status Strip */}
                  <div className={`flex sm:flex-col sm:w-28 shrink-0 items-center sm:justify-center justify-between px-4 py-3 sm:px-3 sm:py-0 border-b sm:border-b-0 sm:border-l border-black/5 dark:border-white/5 ${statusConfig[p.payment_status].bg}`}>
                    <span className="text-[13px] font-black">{statusConfig[p.payment_status].label}</span>
                    <span className="sm:hidden text-[13px] font-black text-primary">#{p.id}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center min-w-0 px-4 py-3 gap-2 sm:gap-5">
                    <div className="hidden sm:flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[15px] font-black text-primary">#{p.id}</span>
                        <span className="text-[12px] font-bold text-slate-500 dark:text-white/60 bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-[8px]">
                          {new Date(p.created_at).toLocaleDateString('ar')}
                        </span>
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-[6px]">
                          {p.items.length} منتج
                        </span>
                      </div>
                      <span className="text-[14px] font-bold text-slate-600 dark:text-white/60 truncate">
                        {p.supplier.name}
                      </span>
                    </div>

                    {/* Mobile */}
                    <span className="sm:hidden text-[12px] font-bold text-slate-500 dark:text-white/60 bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-[8px] self-start">
                      {new Date(p.created_at).toLocaleDateString('ar')}
                    </span>
                    <span className="sm:hidden text-[15px] font-black text-slate-800 dark:text-white truncate">
                      {p.supplier.name}
                    </span>

                    {/* Meta + Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 mt-1 sm:mt-0 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="font-black text-slate-800 dark:text-white text-sm">{p.total} د</span>
                        {+p.due_amount > 0 && (
                          <span className="text-xs font-bold text-red-500">متبقي: {p.due_amount}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/purchases/${p.id}`}
                          className="flex items-center gap-1.5 px-3 h-9 rounded-[12px] bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white border border-black/10 dark:border-white/10 hover:border-primary text-slate-600 dark:text-white/60 font-bold text-[13px] transition-all">
                          <Eye className="w-3.5 h-3.5" /> تفاصيل
                        </Link>
                        <button onClick={() => setDeleteId(p.id)}
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

        <ConfirmModal isOpen={deleteId !== null} onConfirm={() => deleteId && deletePurchase(deleteId)} onCancel={() => setDeleteId(null)} />

      </div>
    </AppShell>
  );
}
