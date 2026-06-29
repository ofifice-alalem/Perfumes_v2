import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ArrowRight, Printer, Calendar, User, Info, FileText, PackageOpen } from 'lucide-react';

interface Category { id: number; name: string; }
interface Product { id: number; name: string; category: Category; }
interface LogItem { id: number; product: Product; system_stock: string; actual_stock: string; difference: string; reason: string | null; }
interface Log { id: number; notes: string; created_at: string; user: { id: number; name: string }; items: LogItem[]; }
interface Props { log: Log; }

const reasonLabels: Record<string, string> = {
    'broken': 'كسر',
    'spilled': 'انسكاب',
    'expired': 'منتهي الصلاحية',
    'lost': 'مفقود',
    'other': 'أخرى',
};

export default function InventoryLogsShow({ log }: Props) {
    const dateObj = new Date(log.created_at);
    const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
    const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });

    return (
        <AppShell pageTitle={`سجل الجرد #${log.id}`}>
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/inventory-logs" className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-all">
                            <ArrowRight className="w-5 h-5 text-slate-700 dark:text-white" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 dark:text-white">تفاصيل الجرد #{log.id}</h1>
                            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تفاصيل ومقارنات المخزون لتلك الجلسة</p>
                        </div>
                    </div>
                    <a href={`/inventory-logs/${log.id}/pdf`} target="_blank"
                        className="h-11 px-5 rounded-[14px] bg-red-500 hover:bg-red-600 text-white font-bold transition-all flex items-center gap-2">
                        <Printer className="w-4 h-4" /> <span className="hidden sm:inline">طباعة PDF</span>
                    </a>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Info Card */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <SpatialCard title="معلومات الجرد" icon={<Info className="w-4 h-4" />}>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-black/3 dark:bg-white/5">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 dark:text-white/50">تاريخ الجرد</div>
                                        <div className="text-sm font-black text-slate-800 dark:text-white">{dateStr} {timeStr}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-black/3 dark:bg-white/5">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 dark:text-white/50">بواسطة</div>
                                        <div className="text-sm font-black text-slate-800 dark:text-white">{log.user?.name ?? 'غير محدد'}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-black/3 dark:bg-white/5">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 dark:text-white/50">ملاحظات الجرد</div>
                                        <div className="text-sm font-bold text-slate-800 dark:text-white leading-relaxed">{log.notes || 'لا توجد ملاحظات'}</div>
                                    </div>
                                </div>
                            </div>
                        </SpatialCard>
                    </div>

                    {/* Table Card */}
                    <div className="lg:col-span-2">
                        <SpatialCard title={`المنتجات (${log.items.length})`} icon={<PackageOpen className="w-4 h-4" />}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-[16px]">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            {['المنتج', 'التصنيف', 'النظامي', 'الفعلي', 'الفارق', 'السبب'].map(h => (
                                                <th key={h} className="text-right px-4 py-4 text-sm font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {log.items.map(item => {
                                            const diff = parseFloat(item.difference);
                                            const isGain = diff > 0;
                                            const isWaste = diff < 0;
                                            return (
                                                <tr key={item.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                    <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{item.product?.name ?? 'محذوف'}</td>
                                                    <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/60 text-xs">{item.product?.category?.name ?? '—'}</td>
                                                    <td className="px-4 py-4 font-black text-slate-700 dark:text-white">{Number(item.system_stock)}</td>
                                                    <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{Number(item.actual_stock)}</td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        {diff === 0 ? <span className="font-bold text-slate-400 dark:text-white/40">مطابق</span> : 
                                                         isGain ? <span className="font-bold text-emerald-500">+{Number(diff)}</span> :
                                                         <span className="font-bold text-red-500">{Number(diff)}</span>}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {isWaste && <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">{reasonLabels[item.reason || ''] || item.reason || '—'}</span>}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </SpatialCard>
                    </div>
                </div>

            </div>
        </AppShell>
    );
}
