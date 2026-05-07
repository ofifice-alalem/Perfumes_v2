import { useState } from 'react';
import { router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { Link } from '@inertiajs/react';
import { Plus, Eye, Trash2, AlertTriangle, X, SlidersHorizontal, ChevronDown, Search } from 'lucide-react';
import { createPortal } from 'react-dom';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { ModernSelect } from '@/components/ui/SpatialComponents';

interface User { id: number; name: string; }
interface Product { id: number; name: string; stock: string; category_id: number; }
interface Category { id: number; name: string; unit: string; }
interface WasteItem {
    id: number;
    product: Product & { category: Category };
    quantity: string;
    reason: string;
    notes: string | null;
}
interface WasteLog {
    id: number;
    user: User;
    notes: string | null;
    created_at: string;
    items: WasteItem[];
}
interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    wasteLogs: Paginated<WasteLog>;
    users: User[];
    products: Product[];
    flash?: { success?: string; error?: string };
}

function fmt(v: string | number) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDate(v: string | null): string {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) || d.getFullYear() < 2000 ? '—' : d.toLocaleDateString('en-GB');
}

function DeleteWasteLogModal({ wasteLog, onClose }: { wasteLog: WasteLog; onClose: () => void }) {
    function confirm() {
        router.delete(`/waste-logs/${wasteLog.id}`, {
            onSuccess: onClose,
        });
    }

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-md rounded-[28px] p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200
                border border-black/10 dark:border-white/[0.12]
                bg-gradient-to-br from-white to-slate-100
                dark:[background:linear-gradient(145deg,rgba(40,60,120,0.45)_0%,rgba(20,25,55,0.35)_100%)]
                backdrop-blur-3xl shadow-2xl shadow-black/10 dark:shadow-black/50">

                <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-[16px] bg-red-500/12 border border-red-500/15 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <button onClick={onClose}
                        className="w-9 h-9 rounded-full bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">حذف سجل التالف</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                        سيتم حذف السجل واستعادة المخزون لجميع المنتجات المسجلة.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={onClose}
                        className="flex-1 h-11 rounded-[14px] bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-600 dark:text-white/70 font-bold text-sm transition-all border border-black/8 dark:border-white/10">
                        إلغاء
                    </button>
                    <button onClick={confirm}
                        className="flex-1 h-11 rounded-[14px] bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-red-500/30">
                        <Trash2 className="w-4 h-4" /> تأكيد الحذف
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function WasteLogsIndex({ wasteLogs, users, products, flash }: Props) {
    const [deleteTarget, setDeleteTarget] = useState<WasteLog | null>(null);
    const [filterOpen, setFilterOpen] = useState(false);

    const params = new URLSearchParams(window.location.search);
    const [fUser, setFUser] = useState(params.get('filter[user_id]') ?? '');
    const [fProduct, setFProduct] = useState(params.get('filter[product_id]') ?? '');
    const [fReason, setFReason] = useState(params.get('filter[reason]') ?? '');
    const [fDateFrom, setFDateFrom] = useState(params.get('filter[date_from]') ?? '');
    const [fDateTo, setFDateTo] = useState(params.get('filter[date_to]') ?? '');

    const hasFilter = fUser || fProduct || fReason || fDateFrom || fDateTo;

    function applyFilter() {
        const f: Record<string, string> = {};
        if (fUser) f['filter[user_id]'] = fUser;
        if (fProduct) f['filter[product_id]'] = fProduct;
        if (fReason) f['filter[reason]'] = fReason;
        if (fDateFrom) f['filter[date_from]'] = fDateFrom;
        if (fDateTo) f['filter[date_to]'] = fDateTo;
        router.get('/waste-logs', f, { preserveScroll: true });
    }

    function resetFilter() {
        setFUser(''); setFProduct(''); setFReason('');
        setFDateFrom(''); setFDateTo('');
        router.get('/waste-logs', {}, { preserveScroll: true });
    }

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
            <ModernSelect
                label="المسجِّل"
                placeholder="الكل"
                options={[{ label: 'الكل' }, ...users.map(u => ({ label: u.name }))]}
                defaultValue={fUser ? (users.find(u => String(u.id) === fUser)?.name ?? '') : 'الكل'}
                onSelect={val => setFUser(val === 'الكل' ? '' : String(users.find(u => u.name === val)?.id ?? ''))}
            />

            <ModernSelect
                label="المنتج"
                placeholder="الكل"
                options={[{ label: 'الكل' }, ...products.map(p => ({ label: p.name }))]}
                defaultValue={fProduct ? (products.find(p => String(p.id) === fProduct)?.name ?? '') : 'الكل'}
                onSelect={val => setFProduct(val === 'الكل' ? '' : String(products.find(p => p.name === val)?.id ?? ''))}
            />

            <ModernSelect
                label="سبب التلف"
                placeholder="الكل"
                options={[
                    { label: 'الكل' },
                    { label: 'كسر' },
                    { label: 'انسكاب' },
                    { label: 'منتهي الصلاحية' },
                    { label: 'مفقود' },
                    { label: 'أخرى' },
                ]}
                defaultValue={
                    fReason === 'broken' ? 'كسر' :
                    fReason === 'spilled' ? 'انسكاب' :
                    fReason === 'expired' ? 'منتهي الصلاحية' :
                    fReason === 'lost' ? 'مفقود' :
                    fReason === 'other' ? 'أخرى' : 'الكل'
                }
                onSelect={val => setFReason(
                    val === 'كسر' ? 'broken' :
                    val === 'انسكاب' ? 'spilled' :
                    val === 'منتهي الصلاحية' ? 'expired' :
                    val === 'مفقود' ? 'lost' :
                    val === 'أخرى' ? 'other' : ''
                )}
            />

            <DateFilterInput label="من تاريخ" value={fDateFrom} onChange={setFDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={fDateTo} onChange={setFDateTo} />

            <button onClick={applyFilter}
                className="w-full h-11 rounded-[14px] bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                <Search className="w-4 h-4" /> تطبيق الفلتر
            </button>
            {hasFilter && (
                <button onClick={resetFilter}
                    className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                    إعادة تعيين
                </button>
            )}
        </div>
    );

    return (
        <AppShell pageTitle="التالف والخسائر">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">التالف والخسائر</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تسجيل وتتبع المنتجات التالفة</p>
                    </div>
                    <Link href="/waste-logs/create"
                        className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
                        <Plus className="w-4 h-4" /> تسجيل تالف جديد
                    </Link>
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
                {flash?.error && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

                <div className="lg:hidden">
                    <button onClick={() => setFilterOpen(p => !p)}
                        className="w-full flex items-center justify-between px-5 h-12 rounded-[18px] spatial-input font-bold text-[14px] text-slate-700 dark:text-white/70">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4" />
                            فلترة
                            {hasFilter && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {filterOpen && (
                        <div className="mt-3 spatial-card p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                            <FilterPanel />
                        </div>
                    )}
                </div>

                <div className="flex gap-6">
                    <div className="flex-1 min-w-0">
                        <SpatialCard title={`سجلات التالف (${wasteLogs.total})`} icon={<AlertTriangle className="w-4 h-4" />}>
                            {wasteLogs.data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                                    <span className="text-4xl">📦</span>
                                    <span className="font-bold">لا توجد سجلات تالف</span>
                                </div>
                            ) : (
                                <>
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                    {['#', 'المسجِّل', 'عدد المنتجات', 'التاريخ', 'الإجراءات'].map(h => (
                                                        <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {wasteLogs.data.map(log => (
                                                    <tr key={log.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                                        <td className="px-4 py-3 font-bold text-slate-400 dark:text-white/40">#{log.id}</td>
                                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{log.user.name}</td>
                                                        <td className="px-4 py-3 font-black text-slate-700 dark:text-white/80">{log.items.length}</td>
                                                        <td className="px-4 py-3 text-slate-500 dark:text-white/50 whitespace-nowrap font-bold text-xs">
                                                            {fmtDate(log.created_at)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <Link href={`/waste-logs/${log.id}`}
                                                                    className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-xs">
                                                                    <Eye className="w-3 h-3" /> عرض
                                                                </Link>
                                                                <button onClick={() => setDeleteTarget(log)}
                                                                    className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs">
                                                                    <Trash2 className="w-3 h-3" /> حذف
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex flex-col gap-4 lg:hidden">
                                        {wasteLogs.data.map(log => (
                                            <div key={log.id} className="rounded-[24px] border border-black/8 dark:border-white/12 overflow-hidden">
                                                <div className="px-5 py-4 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                                    <div>
                                                        <span className="font-black text-slate-800 dark:text-white">{log.user.name}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">#{log.id}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-5">
                                                    <div className="flex items-center justify-between py-3">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">عدد المنتجات</span>
                                                        <span className="font-black text-slate-700 dark:text-white/80">{log.items.length}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-3">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">التاريخ</span>
                                                        <span className="font-bold text-slate-500 dark:text-white/60">{fmtDate(log.created_at)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 px-5 py-4 border-t border-black/5 dark:border-white/8">
                                                    <Link href={`/waste-logs/${log.id}`}
                                                        className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm">
                                                        <Eye className="w-4 h-4" /> عرض
                                                    </Link>
                                                    <button onClick={() => setDeleteTarget(log)}
                                                        className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                                        <Trash2 className="w-4 h-4" /> حذف
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {wasteLogs.last_page > 1 && (
                                        <div className="flex items-center justify-center gap-2 pt-4 flex-wrap">
                                            {wasteLogs.links.map((link, i) => (
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

                    <div className="hidden lg:block w-[360px] shrink-0">
                        <SpatialCard title="فلترة" icon={<SlidersHorizontal className="w-4 h-4" />}>
                            <FilterPanel />
                        </SpatialCard>
                    </div>
                </div>
            </div>

            {deleteTarget && (
                <DeleteWasteLogModal wasteLog={deleteTarget} onClose={() => setDeleteTarget(null)} />
            )}
        </AppShell>
    );
}
