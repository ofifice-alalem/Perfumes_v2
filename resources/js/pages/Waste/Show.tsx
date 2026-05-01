import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Trash2, Package, AlertTriangle } from 'lucide-react';

interface Category  { id: number; name: string; unit: string; }
interface Product   { id: number; name: string; category: Category; }
interface WasteItem {
  id: number; quantity: string; reason: string; notes: string | null;
  product: Product;
}
interface WasteLog {
  id: number; notes: string | null; created_at: string;
  user: { name: string };
  items: WasteItem[];
}

interface Props {
  log: WasteLog;
  flash?: { success?: string; error?: string };
}

const reasonLabels: Record<string, string> = {
  broken: 'كسر', spilled: 'انسكاب', expired: 'فساد', lost: 'مفقود', other: 'أخرى',
};

const reasonColors: Record<string, string> = {
  broken:  'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  spilled: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  expired: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  lost:    'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  other:   'bg-black/5 text-slate-600 dark:text-white/60 border-black/10 dark:border-white/10',
};

export default function WasteShow({ log, flash }: Props) {
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  function removeItem(itemId: number) {
    router.delete(`/waste/${log.id}/items/${itemId}`, { onSuccess: () => setDeleteItemId(null) });
  }

  return (
    <AppShell pageTitle="تفاصيل سجل التالف">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/waste" className="text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">← التالف</Link>
          <span className="text-slate-300 dark:text-white/20">/</span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">سجل تالف #{log.id}</h1>
          <span className="text-xs font-black px-3 py-1 rounded-[8px] bg-red-500/10 text-red-500 border border-red-500/20">
            {log.items.length} منتج
          </span>
        </div>

        {/* Flash */}
        {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
        {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — Items */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Info */}
            <SpatialCard title="معلومات السجل" hideHeader>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'المسجِّل', value: log.user.name },
                  { label: 'التاريخ',  value: new Date(log.created_at).toLocaleDateString('ar') },
                  { label: 'عدد المنتجات', value: String(log.items.length) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">{label}</span>
                    <span className="font-black text-slate-800 dark:text-white text-sm">{value}</span>
                  </div>
                ))}
              </div>
              {log.notes && <p className="mt-3 text-sm font-bold text-slate-500 dark:text-white/50 px-1">{log.notes}</p>}
            </SpatialCard>

            {/* Items Table */}
            <SpatialCard title="المنتجات التالفة" icon={<AlertTriangle className="w-4 h-4 text-red-500" />}>
              {log.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-white/30 gap-2">
                  <span className="text-3xl">📦</span>
                  <span className="font-bold text-sm">لا توجد منتجات</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/5 dark:border-white/5">
                        <th className="px-4 py-2 text-right text-xs font-bold text-slate-400 dark:text-white/40">المنتج</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-slate-400 dark:text-white/40">الكمية</th>
                        <th className="px-4 py-2 text-center text-xs font-bold text-slate-400 dark:text-white/40">السبب</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-slate-400 dark:text-white/40">ملاحظة</th>
                        <th className="px-4 py-2 text-center text-xs font-bold text-slate-400 dark:text-white/40">حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.items.map(item => (
                        <tr key={item.id} className="border-b border-black/3 dark:border-white/3 hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-800 dark:text-white">{item.product.name}</span>
                            <span className="block text-xs text-slate-400 dark:text-white/40">{item.product.category.name}</span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                            {item.quantity}{item.product.category.unit}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-bold px-2 py-1 rounded-[8px] border ${reasonColors[item.reason]}`}>
                              {reasonLabels[item.reason]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 dark:text-white/40 font-bold">
                            {item.notes ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => setDeleteItemId(item.id)}
                              className="w-8 h-8 rounded-[8px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all mx-auto">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SpatialCard>
          </div>

          {/* Right — Summary */}
          <div>
            <SpatialCard title="ملخص السجل">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5">
                  <span className="text-sm font-bold text-slate-500 dark:text-white/50">إجمالي المنتجات</span>
                  <span className="font-black text-lg text-slate-800 dark:text-white">{log.items.length}</span>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  {Object.entries(reasonLabels).map(([key, label]) => {
                    const count = log.items.filter(i => i.reason === key).length;
                    if (!count) return null;
                    return (
                      <div key={key} className={`flex items-center justify-between px-3 py-2 rounded-[10px] border ${reasonColors[key]}`}>
                        <span className="font-bold text-sm">{label}</span>
                        <span className="font-black">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SpatialCard>
          </div>
        </div>

        <ConfirmModal isOpen={deleteItemId !== null} title="حذف المنتج" message="هل أنت متأكد؟ سيُعاد المخزون تلقائياً."
          onConfirm={() => deleteItemId && removeItem(deleteItemId)} onCancel={() => setDeleteItemId(null)} />

      </div>
    </AppShell>
  );
}
