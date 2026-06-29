import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { RefreshCw, Eye, Trash2, AlertTriangle, X, Plus } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';

interface Period {
    id: number;
    name: string;
    status: 'open' | 'closed';
    started_at: string;
    closed_at: string | null;
    created_by: number;
    created_by_name?: string;
    snapshot: { id: number } | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    periods: Paginated<Period & { created_by_user?: { name: string } }>;
    currentPeriod: Period | null;
    flash?: { success?: string; error?: string };
}

function fmtDate(v: string | null): string {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

function PurgeModal({ period, onClose }: { period: Period; onClose: () => void }) {
    function confirm() {
        router.delete(`/periods/${period.id}/purge`, { onSuccess: onClose });
    }
    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-md rounded-[28px] p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200
                border border-black/10 dark:border-white/[0.12]
                bg-gradient-to-br from-white to-slate-100
                dark:[background:linear-gradient(145deg,rgba(40,60,120,0.45)_0%,rgba(20,25,55,0.35)_100%)]
                backdrop-blur-3xl shadow-2xl shadow-black/10 dark:shadow-black/50">
                <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-[16px] bg-red-500/12 border border-red-500/15 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">حذف بيانات الفترة</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                        سيتم حذف جميع البيانات التشغيلية للفترة <strong>{period.name}</strong>.<br />
                        الـ Snapshot سيبقى محفوظاً للأبد.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="flex-1 h-11 rounded-[14px] bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-600 dark:text-white/70 font-bold text-sm transition-all border border-black/8 dark:border-white/10">
                        إلغاء
                    </button>
                    <button onClick={confirm} className="flex-1 h-11 rounded-[14px] bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-red-500/30">
                        <Trash2 className="w-4 h-4" /> تأكيد الحذف
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function PeriodsIndex({ periods, currentPeriod, flash }: Props) {
    const [purgeTarget, setPurgeTarget] = useState<Period | null>(null);

    return (
        <AppShell pageTitle="الإقفال والجرد">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">الإقفال والجرد</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">إدارة عمليات الإقفال المالي وتدوير الحسابات</p>
                    </div>
                    {currentPeriod && (
                        <Link href="/periods/rollover"
                            className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
                            <RefreshCw className="w-4 h-4" /> تنفيذ التدوير
                        </Link>
                    )}
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
                {flash?.error && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

                {currentPeriod && (
                    <div className="px-5 py-4 rounded-[18px] bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                            الفترة الحالية: <strong>{currentPeriod.name}</strong> — مفتوحة منذ {fmtDate(currentPeriod.started_at)}
                        </span>
                    </div>
                )}

                <SpatialCard title={`الفترات (${periods.total})`} icon={<RefreshCw className="w-4 h-4" />}>
                    {periods.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                            <span className="text-4xl">📅</span>
                            <span className="font-bold">لا توجد فترات محاسبية</span>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-[16px]">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            {['#', 'الاسم', 'الحالة', 'تاريخ الفتح', 'تاريخ الإغلاق', 'Snapshot', 'الإجراءات'].map(h => (
                                                <th key={h} className="text-right px-4 py-4 text-sm font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {periods.data.map(period => (
                                            <tr key={period.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                <td className="px-4 py-4 font-bold text-slate-400 dark:text-white/40">#{period.id}</td>
                                                <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{period.name}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-[8px] border ${
                                                        period.status === 'open'
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                                    }`}>
                                                        {period.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-slate-500 dark:text-white/50 whitespace-nowrap font-bold text-xs"><span className="px-2.5 py-1 rounded-[8px] bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5 text-[16px]">{fmtDate(period.started_at)}</span></td>
                                                <td className="px-4 py-4 text-slate-500 dark:text-white/50 whitespace-nowrap font-bold text-xs"><span className="px-2.5 py-1 rounded-[8px] bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5 text-[16px]">{fmtDate(period.closed_at)}</span></td>
                                                <td className="px-4 py-4">
                                                    {period.snapshot ? (
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">محفوظ</span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/30">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {period.snapshot && (
                                                            <Link href={`/periods/${period.id}/snapshot`}
                                                                className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-xs">
                                                                <Eye className="w-3 h-3" /> Snapshot
                                                            </Link>
                                                        )}
                                                        {period.status === 'closed' && period.snapshot && (
                                                            <button onClick={() => setPurgeTarget(period)}
                                                                className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs">
                                                                <Trash2 className="w-3 h-3" /> Purge
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="flex flex-col gap-4 lg:hidden">
                                {periods.data.map(period => (
                                    <div key={period.id} className="rounded-[24px] border border-black/8 dark:border-white/12 overflow-hidden">
                                        <div className="px-5 py-4 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                            <div>
                                                <span className="font-black text-slate-800 dark:text-white">{period.name}</span>
                                                <div className="text-xs font-bold text-slate-400 dark:text-white/40 mt-0.5">#{period.id}</div>
                                            </div>
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-[8px] border ${
                                                period.status === 'open'
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                    : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                            }`}>
                                                {period.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-5">
                                            <div className="flex items-center justify-between py-3">
                                                <span className="text-sm font-bold text-slate-400 dark:text-white/40">تاريخ الفتح</span>
                                                <span className="font-bold text-slate-600 dark:text-white/60">{fmtDate(period.started_at)}</span>
                                            </div>
                                            <div className="flex items-center justify-between py-3">
                                                <span className="text-sm font-bold text-slate-400 dark:text-white/40">تاريخ الإغلاق</span>
                                                <span className="font-bold text-slate-600 dark:text-white/60">{fmtDate(period.closed_at)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 px-5 py-4 border-t border-black/5 dark:border-white/8">
                                            {period.snapshot && (
                                                <Link href={`/periods/${period.id}/snapshot`}
                                                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm">
                                                    <Eye className="w-4 h-4" /> Snapshot
                                                </Link>
                                            )}
                                            {period.status === 'closed' && period.snapshot && (
                                                <button onClick={() => setPurgeTarget(period)}
                                                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                                    <Trash2 className="w-4 h-4" /> Purge
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {periods.last_page > 1 && (
                                <div className="flex items-center justify-center gap-2 pt-4 flex-wrap">
                                    {periods.links.map((link, i) => (
                                        link.url ? (
                                            <Link key={i} href={link.url}
                                                className={`px-4 h-9 rounded-[12px] font-bold text-sm flex items-center transition-all ${link.active ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ) : (
                                            <span key={i} className="px-4 h-9 rounded-[12px] font-bold text-sm flex items-center text-slate-300 dark:text-white/20"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        )
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </SpatialCard>
            </div>

            {purgeTarget && <PurgeModal period={purgeTarget} onClose={() => setPurgeTarget(null)} />}
        </AppShell>
    );
}
