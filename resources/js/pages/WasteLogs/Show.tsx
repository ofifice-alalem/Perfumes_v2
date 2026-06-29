import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ChevronLeft, User, Calendar, FileText, Package, AlertTriangle } from 'lucide-react';

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
    broken: 'bg-red-500/10 text-red-500 border-red-500/20',
    spilled: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    expired: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    lost: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    other: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
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
        <AppShell pageTitle={`سجل تالف #${wasteLog.id}`}>
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/waste-logs"
                            className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 flex items-center justify-center transition-all">
                            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-white/60" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 dark:text-white">سجل تالف #{wasteLog.id}</h1>
                            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">تفاصيل المنتجات التالفة</p>
                        </div>
                    </div>
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}

                <div className="grid lg:grid-cols-[1fr_400px] gap-6">
                    {/* Main Content */}
                    <div className="flex flex-col gap-6">
                        {/* Items */}
                        <SpatialCard title={`المنتجات التالفة (${wasteLog.items.length})`} icon={<Package className="w-4 h-4" />}>
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-[16px]">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            {['المنتج', 'الكمية', 'السبب', 'ملاحظة'].map(h => (
                                                <th key={h} className="text-right px-4 py-4 text-sm font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {wasteLog.items.map(item => (
                                            <tr key={item.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800 dark:text-white">{item.product.name}</span>
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">{item.product.category.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 font-black text-slate-700 dark:text-white/80 whitespace-nowrap">
                                                    {fmt(item.quantity)} {item.product.category.unit}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-[8px] border ${reasonColor[item.reason]}`}>
                                                        {reasonLabel[item.reason]}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-slate-500 dark:text-white/50 text-xs font-bold">
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
                                    <div key={item.id} className="rounded-[18px] border border-black/8 dark:border-white/12 overflow-hidden">
                                        <div className="px-4 py-3 bg-black/3 dark:bg-white/6">
                                            <span className="font-black text-slate-800 dark:text-white">{item.product.name}</span>
                                            <div className="text-xs font-bold text-slate-400 dark:text-white/40 mt-0.5">{item.product.category.name}</div>
                                        </div>
                                        <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-4">
                                            <div className="flex items-center justify-between py-2.5">
                                                <span className="text-sm font-bold text-slate-400 dark:text-white/40">الكمية</span>
                                                <span className="font-black text-slate-700 dark:text-white/80">{fmt(item.quantity)} {item.product.category.unit}</span>
                                            </div>
                                            <div className="flex items-center justify-between py-2.5">
                                                <span className="text-sm font-bold text-slate-400 dark:text-white/40">السبب</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${reasonColor[item.reason]}`}>
                                                    {reasonLabel[item.reason]}
                                                </span>
                                            </div>
                                            {item.notes && (
                                                <div className="flex items-center justify-between py-2.5">
                                                    <span className="text-sm font-bold text-slate-400 dark:text-white/40">ملاحظة</span>
                                                    <span className="font-bold text-slate-600 dark:text-white/60 text-sm">{item.notes}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SpatialCard>
                    </div>

                    {/* Sidebar */}
                    <div className="flex flex-col gap-6">
                        {/* Info Card */}
                        <SpatialCard title="معلومات السجل" icon={<AlertTriangle className="w-4 h-4" />}>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-[12px] bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                        <User className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-slate-400 dark:text-white/40 mb-1">المسجِّل</div>
                                        <div className="font-black text-slate-800 dark:text-white">{wasteLog.user.name}</div>
                                    </div>
                                </div>

                                <div className="h-px bg-black/5 dark:bg-white/8" />

                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-[12px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                        <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-slate-400 dark:text-white/40 mb-1">تاريخ التسجيل</div>
                                        <div className="font-bold text-slate-700 dark:text-white/80 text-sm"><span className="px-2.5 py-1 rounded-[8px] bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5 text-[16px] font-black text-slate-800 dark:text-white/90 tracking-widest inline-block">{fmtDate(wasteLog.created_at)}</span></div>
                                    </div>
                                </div>

                                {wasteLog.notes && (
                                    <>
                                        <div className="h-px bg-black/5 dark:bg-white/8" />
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-[12px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                                <FileText className="w-5 h-5 text-amber-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold text-slate-400 dark:text-white/40 mb-1">ملاحظات</div>
                                                <div className="font-bold text-slate-700 dark:text-white/80 text-sm leading-relaxed">{wasteLog.notes}</div>
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
