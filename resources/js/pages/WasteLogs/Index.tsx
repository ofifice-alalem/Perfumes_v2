import { useState, useMemo } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, Eye, Trash2, AlertTriangle, X, SlidersHorizontal, RotateCcw, Search, Calendar, PackageCheck, FileSpreadsheet } from 'lucide-react';
import { createPortal } from 'react-dom';
import { DateFilterInput } from '@/components/ui/DateFilterInput';

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
    return isNaN(d.getTime()) || d.getFullYear() < 2000 ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

function DeleteWasteLogModal({ wasteLog, onClose }: { wasteLog: WasteLog; onClose: () => void }) {
    function confirm() {
        router.delete(`/waste-logs/${wasteLog.id}`, {
            onSuccess: onClose,
        });
    }

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full sm:max-w-md rounded-[28px] p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200
                border-2 border-red-500/30
                bg-white dark:bg-slate-900
                shadow-2xl shadow-black/40">

                <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-[20px] bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-7 h-7 text-red-500" />
                    </div>
                    <button onClick={onClose}
                        className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">حذف سجل التالف #{wasteLog.id}</h3>
                    <p className="text-base font-bold text-slate-500 dark:text-white/60 leading-relaxed">
                        سيتم حذف السجل واستعادة المخزون لجميع المنتجات المسجلة ({wasteLog.items.length} منتج).
                    </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <button onClick={onClose}
                        className="flex-1 h-14 rounded-[18px] bg-black/5 dark:bg-white/10 text-slate-600 dark:text-white/70 font-black text-base transition-all hover:bg-black/10 active:scale-95">
                        إلغاء
                    </button>
                    <button onClick={confirm}
                        className="flex-1 h-14 rounded-[18px] bg-red-500 hover:bg-red-600 text-white font-black text-base transition-all flex items-center justify-center gap-2.5 shadow-lg active:scale-95">
                        <Trash2 className="w-5 h-5" /> تأكيد الحذف
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
        setFilterOpen(false);
    }

    function resetFilter() {
        setFUser(''); setFProduct(''); setFReason('');
        setFDateFrom(''); setFDateTo('');
        router.get('/waste-logs', {}, { preserveScroll: true });
        setFilterOpen(false);
    }

    // KPI stats
    const totalItemsCount = useMemo(() => {
        return wasteLogs.data.reduce((acc, log) => acc + log.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0), 0);
    }, [wasteLogs.data]);

    const FilterPanel = () => (
        <div className="flex flex-col gap-5">
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

            <div className="flex flex-col gap-3 pt-2">
                <button onClick={applyFilter}
                    className="w-full h-14 rounded-[18px] bg-primary text-white font-black text-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2.5 shadow-md active:scale-95">
                    <Search className="w-5 h-5" /> تطبيق الفلتر
                </button>
                {hasFilter && (
                    <button onClick={resetFilter}
                        className="w-full h-14 rounded-[18px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-slate-600 dark:text-white/70 font-black text-lg transition-all flex items-center justify-center gap-2.5 active:scale-95">
                        <RotateCcw className="w-5 h-5" /> إعادة تعيين
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <AppShell pageTitle="التالف والخسائر">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">التالف والخسائر</h1>
                        <p className="text-base font-bold text-slate-400 dark:text-white/40 mt-1">تسجيل وتتبع المنتجات التالفة وتحديث المخزون</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setFilterOpen(true)}
                            className="spatial-button h-14 px-6 rounded-[20px] font-black text-base flex items-center gap-2.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-700 dark:text-white active:scale-95">
                            <SlidersHorizontal className="w-5 h-5" />
                            <span>الفلاتر</span>
                            {hasFilter && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </button>
                        <Link href="/waste-logs/create"
                            className="spatial-button h-14 px-8 rounded-[20px] font-black text-base sm:text-lg flex items-center gap-2.5 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 active:scale-95">
                            <Plus className="w-6 h-6" /> تسجيل تالف جديد
                        </Link>
                    </div>
                </div>

                {flash?.success && <div className="px-6 py-4 rounded-[20px] bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-lg">{flash.success}</div>}
                {flash?.error && <div className="px-6 py-4 rounded-[20px] bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 font-black text-lg">{flash.error}</div>}

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SpatialCard>
                        <div className="flex items-center gap-4 p-2">
                            <div className="w-14 h-14 rounded-[20px] bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-7 h-7 text-red-500" />
                            </div>
                            <div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">إجمالي عمليات التلف</span>
                                <p className="text-3xl font-black text-slate-800 dark:text-white mt-0.5">{wasteLogs.total}</p>
                            </div>
                        </div>
                    </SpatialCard>

                    <SpatialCard>
                        <div className="flex items-center gap-4 p-2">
                            <div className="w-14 h-14 rounded-[20px] bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center shrink-0">
                                <PackageCheck className="w-7 h-7 text-amber-500" />
                            </div>
                            <div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">إجمالي القطع التالفة في الصفحة</span>
                                <p className="text-3xl font-black text-amber-500 mt-0.5">{fmt(totalItemsCount)}</p>
                            </div>
                        </div>
                    </SpatialCard>

                    <SpatialCard>
                        <div className="flex items-center gap-4 p-2">
                            <div className="w-14 h-14 rounded-[20px] bg-blue-500/10 border-2 border-blue-500/20 flex items-center justify-center shrink-0">
                                <FileSpreadsheet className="w-7 h-7 text-blue-500" />
                            </div>
                            <div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">صفحات السجلات</span>
                                <p className="text-3xl font-black text-slate-800 dark:text-white mt-0.5">{wasteLogs.current_page} / {wasteLogs.last_page}</p>
                            </div>
                        </div>
                    </SpatialCard>
                </div>

                {/* Main Table / Cards Container */}
                <SpatialCard title={`سجلات التالف (${wasteLogs.total})`} icon={<AlertTriangle className="w-5 h-5 text-red-500" />}>
                    {wasteLogs.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-4">
                            <span className="text-6xl">📦</span>
                            <span className="font-black text-xl">لا توجد سجلات تالف مطابقة</span>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b-2 border-black/5 dark:border-white/5">
                                            {['# السجل', 'المسجِّل', 'عدد المواد', 'التاريخ', 'الإجراءات'].map(h => (
                                                <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {wasteLogs.data.map(log => (
                                            <tr key={log.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors group">
                                                <td className="px-5 py-6 font-black text-slate-400 dark:text-white/40 text-xl whitespace-nowrap">#{log.id}</td>
                                                <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl whitespace-nowrap">{log.user.name}</td>
                                                <td className="px-5 py-6 font-black text-amber-500 text-2xl whitespace-nowrap">{log.items.length} <span className="text-sm font-bold opacity-75">صنف</span></td>
                                                <td className="px-5 py-6 whitespace-nowrap">
                                                    <span className="text-base font-black text-slate-600 dark:text-white/70 px-3 py-1.5 rounded-[12px] bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5">
                                                        {fmtDate(log.created_at)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-6 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <Link href={`/waste-logs/${log.id}`}
                                                            className="flex items-center gap-2.5 px-6 sm:px-8 h-14 sm:h-16 rounded-[20px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                            <Eye className="w-5 h-5 sm:w-6 sm:h-6" /> عرض
                                                        </Link>
                                                        <button onClick={() => setDeleteTarget(log)}
                                                            className="flex items-center gap-2.5 px-6 sm:px-8 h-14 sm:h-16 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" /> حذف
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="flex flex-col gap-4 lg:hidden">
                                {wasteLogs.data.map(log => (
                                    <div key={log.id} className="p-6 rounded-[28px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/10 flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-black text-slate-800 dark:text-white text-2xl">{log.user.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-sm font-bold text-slate-400 dark:text-white/60">سجل #{log.id}</span>
                                                </div>
                                            </div>
                                            <span className="text-base font-black text-slate-600 dark:text-white/70 px-3 py-1 rounded-[12px] bg-black/5 dark:bg-white/10">
                                                {fmtDate(log.created_at)}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <div>
                                                <span className="text-xs font-black text-slate-500">عدد المواد</span>
                                                <p className="font-black text-2xl text-amber-500">{log.items.length} صنف</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-black text-slate-500">التاريخ</span>
                                                <p className="font-black text-xl text-slate-700 dark:text-white/80">{fmtDate(log.created_at)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 pt-3">
                                            <Link href={`/waste-logs/${log.id}`}
                                                className="flex-1 flex items-center justify-center gap-2.5 h-14 rounded-[20px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-base sm:text-lg active:scale-95 shadow-md">
                                                <Eye className="w-5 h-5" /> عرض
                                            </Link>
                                            <button onClick={() => setDeleteTarget(log)}
                                                className="flex-1 flex items-center justify-center gap-2.5 h-14 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all font-black text-base sm:text-lg active:scale-95 shadow-md">
                                                <Trash2 className="w-5 h-5" /> حذف
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {wasteLogs.last_page > 1 && (
                                <div className="flex items-center justify-center gap-2 pt-6 flex-wrap">
                                    {wasteLogs.links.map((link, i) => (
                                        link.url ? (
                                            <Link key={i} href={link.url}
                                                className={`px-5 h-12 rounded-[16px] font-black text-base flex items-center transition-all ${link.active ? 'bg-primary text-white shadow-md' : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-white/70 hover:bg-black/10'}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ) : (
                                            <span key={i} className="px-5 h-12 rounded-[16px] font-black text-base flex items-center text-slate-300 dark:text-white/20"
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

            {/* Filter Drawer Portal */}
            {filterOpen && createPortal(
                <div className="fixed inset-0 z-[1000]">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setFilterOpen(false)} />
                    <div className="absolute top-0 right-0 w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl p-6 flex flex-col gap-6 overflow-y-auto animate-in slide-in-from-right duration-300 border-l-2 border-black/10 dark:border-white/10 z-10" dir="rtl">
                        <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-[14px] bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    <SlidersHorizontal className="w-5 h-5 text-primary" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white">تصفية نتائج التالف</h2>
                            </div>
                            <button onClick={() => setFilterOpen(false)}
                                className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <FilterPanel />
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Modal Portal */}
            {deleteTarget && (
                <DeleteWasteLogModal wasteLog={deleteTarget} onClose={() => setDeleteTarget(null)} />
            )}
        </AppShell>
    );
}
