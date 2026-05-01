import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Plus, Eye, Trash2, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface WasteLog {
  id: number;
  notes: string | null;
  created_at: string;
  user: { name: string };
  items: { id: number }[];
}

interface Props {
  logs: WasteLog[];
  flash?: { success?: string; error?: string };
}

export default function WasteIndex({ logs, flash }: Props) {
  const [deleteId,   setDeleteId]   = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterUser, setFilterUser] = useState('');

  const filtered = logs.filter(l =>
    !filterUser || l.user.name.toLowerCase().includes(filterUser.toLowerCase())
  );

  function deleteLog(id: number) {
    router.delete(`/waste/${id}`, { onSuccess: () => setDeleteId(null) });
  }

  const FilterPanel = () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">المسجِّل</label>
        <input value={filterUser} onChange={e => setFilterUser(e.target.value)}
          placeholder="بحث..." className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
      </div>
      <button onClick={() => setFilterUser('')}
        className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
        إعادة تعيين
      </button>
    </div>
  );

  return (
    <AppShell pageTitle="التالف والخسائر">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">التالف والخسائر</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">{logs.length} سجل</p>
          </div>
          <Link href="/waste/create"
            className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
            <Plus className="w-4 h-4" /> تسجيل تالف جديد
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
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-3">
                <span className="text-4xl">🗑️</span>
                <span className="font-bold">لا توجد سجلات تالف</span>
              </div>
            ) : (
              filtered.map(log => (
                <div key={log.id} className="spatial-card overflow-hidden flex flex-col sm:flex-row sm:items-stretch">
                  {/* Strip */}
                  <div className="flex sm:flex-col sm:w-28 shrink-0 items-center sm:justify-center justify-between px-4 py-3 sm:px-3 sm:py-0 border-b sm:border-b-0 sm:border-l border-red-500/20 bg-red-500/10 text-red-500">
                    <span className="text-[13px] font-black">تالف</span>
                    <span className="sm:hidden text-[13px] font-black text-primary">#{log.id}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center min-w-0 px-4 py-3 gap-2 sm:gap-5">
                    <div className="hidden sm:flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[15px] font-black text-primary">#{log.id}</span>
                        <span className="text-[12px] font-bold text-slate-500 dark:text-white/60 bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-[8px]">
                          {new Date(log.created_at).toLocaleDateString('ar')}
                        </span>
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-[6px]">
                          {log.items.length} منتج
                        </span>
                      </div>
                      <span className="text-[14px] font-bold text-slate-600 dark:text-white/60">{log.user.name}</span>
                    </div>

                    <span className="sm:hidden text-[12px] font-bold text-slate-500 dark:text-white/60 bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-[8px] self-start">
                      {new Date(log.created_at).toLocaleDateString('ar')}
                    </span>
                    <span className="sm:hidden text-[15px] font-black text-slate-800 dark:text-white">{log.user.name}</span>

                    <div className="flex items-center justify-end gap-2 shrink-0">
                      <Link href={`/waste/${log.id}`}
                        className="flex items-center gap-1.5 px-3 h-9 rounded-[12px] bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white border border-black/10 dark:border-white/10 hover:border-primary text-slate-600 dark:text-white/60 font-bold text-[13px] transition-all">
                        <Eye className="w-3.5 h-3.5" /> تفاصيل
                      </Link>
                      <button onClick={() => setDeleteId(log.id)}
                        className="w-9 h-9 rounded-[12px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 flex items-center justify-center transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
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

        <ConfirmModal isOpen={deleteId !== null} onConfirm={() => deleteId && deleteLog(deleteId)} onCancel={() => setDeleteId(null)} />

      </div>
    </AppShell>
  );
}
