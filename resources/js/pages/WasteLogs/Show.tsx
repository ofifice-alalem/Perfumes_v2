import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ChevronRight, User, Calendar, FileText, Package, AlertTriangle } from 'lucide-react';

interface User { id: number; name: string; }
interface Category { id: number; name: string; unit: string; }
interface Product { id: number; name: string; category: Category; }
interface WasteItem {
    id: number;
    product: Product;
    quantity: string;
    reason: string;
    notes: string | null;
    created_at: string;
}
interface WasteLog {
    id: number;
    user: User;
    notes: string | null;
    created_at: string;
    items: WasteItem[];
}

interface Props {
    wasteLog: WasteLog;
    flash?: { success?: string; error?: string };
}

const reasonLabel: Record<string, string> = {
    broken: 'كسر',
    spilled: 'انسكاب',
    expired: 'منتهي الصلاحية',
    lost: 'مفقود',
    other: 'أخرى',
};

const reasonColor: Record<string, string> = {
    broken: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    spilled: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    expired: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    lost: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    other: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
};

function fmt(v: string | number) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDate(v: string | null): string {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\//g, '-').replace(',', '');
}

export default function WasteLogsShow({ wasteLog, flash }: Props) {
    return (
        <AppShell pageTitle={`تفاصيل سجل التالف #${wasteLog.id}`}>
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/waste-logs"
                            className="w-14 h-14 rounded-[20px] bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-700 dark:text-white flex items-center justify-center transition-all active:scale-95 border-2 border-black/5 dark:border-white/5">
                            <ChevronRight className="w-7 h-7" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">سجل تالف #{wasteLog.id}</h1>
                            <p className="text-base font-bold text-slate-400 dark:text-white/40 mt-0.5">تفاصيل الأصناف والكميات المسجلة في العملية</p>
                        </div>
                    </div>
                </div>

                {flash?.success && <div className="px-6 py-4 rounded-[20px] bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-lg">{flash.success}</div>}

                <div className="grid lg:grid-cols-[1fr_400px] gap-6">
                    {/* Main Content */}
                    <div className="flex flex-col gap-6">
                        {/* Items Table */}
                        <SpatialCard title={`المنتجات التالفة (${wasteLog.items.length})`} icon={<Package className="w-5 h-5 text-primary" />}>
                            {/* Desktop Table */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b-2 border-black/5 dark:border-white/5">
                                            {['اسم المنتج', 'التصنيف', 'الكمية التالفة', 'سبب التلف', 'ملاحظات'].map(h => (
                                                <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {wasteLog.items.map(item => (
                                            <tr key={item.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors group">
                                                <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">
                                                    {item.product.name}
                                                </td>
                                                <td className="px-5 py-6 font-bold text-slate-500 dark:text-white/60 text-xl whitespace-nowrap">
                                                    {item.product.category.name}
                                                </td>
                                                <td className="px-5 py-6 font-black text-red-500 text-2xl whitespace-nowrap">
                                                    {fmt(item.quantity)} <span className="text-sm font-bold opacity-75">{item.product.category.unit}</span>
                                                </td>
                                                <td className="px-5 py-6 whitespace-nowrap">
                                                    <span className={`text-base font-black px-4 py-2 rounded-[14px] border ${reasonColor[item.reason]}`}>
                                                        {reasonLabel[item.reason]}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-6 font-bold text-slate-600 dark:text-white/70 text-lg">
                                                    {item.notes || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="flex flex-col gap-4 lg:hidden">
                                {wasteLog.items.map(item => (
                                    <div key={item.id} className="p-6 rounded-[28px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/10 flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-black text-slate-800 dark:text-white text-2xl">{item.product.name}</span>
                                                <div className="text-sm font-bold text-slate-400 dark:text-white/50 mt-0.5">{item.product.category.name}</div>
                                            </div>
                                            <span className={`text-sm font-black px-3.5 py-1.5 rounded-[12px] border ${reasonColor[item.reason]}`}>
                                                {reasonLabel[item.reason]}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <div>
                                                <span className="text-xs font-black text-slate-500">الكمية</span>
                                                <p className="font-black text-2xl text-red-500">{fmt(item.quantity)} {item.product.category.unit}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-black text-slate-500">ملاحظات</span>
                                                <p className="font-bold text-lg text-slate-700 dark:text-white/80">{item.notes || '—'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SpatialCard>
                    </div>

                    {/* Sidebar */}
                    <div className="flex flex-col gap-6">
                        <SpatialCard title="معلومات السجل" icon={<AlertTriangle className="w-5 h-5 text-red-500" />}>
                            <div className="flex flex-col gap-5 p-2">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-[20px] bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
                                        <User className="w-7 h-7 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">المسجِّل</div>
                                        <div className="font-black text-2xl text-slate-800 dark:text-white mt-0.5">{wasteLog.user.name}</div>
                                    </div>
                                </div>

                                <div className="h-px bg-black/5 dark:bg-white/8" />

                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-[20px] bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center shrink-0">
                                        <Calendar className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">تاريخ التسجيل</div>
                                        <div className="font-black text-xl text-slate-800 dark:text-white mt-0.5">{fmtDate(wasteLog.created_at)}</div>
                                    </div>
                                </div>

                                {wasteLog.notes && (
                                    <>
                                        <div className="h-px bg-black/5 dark:bg-white/8" />
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 rounded-[20px] bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center shrink-0">
                                                <FileText className="w-7 h-7 text-amber-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">ملاحظات عامة</div>
                                                <div className="font-bold text-slate-700 dark:text-white/80 text-lg leading-relaxed mt-1">{wasteLog.notes}</div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </SpatialCard>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
