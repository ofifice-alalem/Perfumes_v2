import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { RotateCcw, SlidersHorizontal, ChevronDown, ChevronRight, Search, FileSpreadsheet, FileText, List } from 'lucide-react';

interface User     { id: number; name: string; }
interface Customer { id: number; name: string; }
interface Supplier { id: number; name: string; }
interface Category { id: number; name: string; }

interface DailyBreakdown   { date: string; total: number; count: number; }
interface MonthlyBreakdown { month: string; total: number; count: number; days: DailyBreakdown[]; }

interface ReturnsData {
    customerReturnsTotal: number; customerReturnsCount: number;
    supplierReturnsTotal: number; supplierReturnsCount: number;
    totalSales: number; returnRate: number | null;
    customerMonthly: MonthlyBreakdown[];
    supplierMonthly: MonthlyBreakdown[];
}

interface Props {
    users: User[]; customers: Customer[]; suppliers: Supplier[]; categories: Category[];
    filters: { dateFrom: string | null; dateTo: string | null; userId: number | null; customerId: number | null; supplierId: number | null; categoryId: number | null; };
    data: ReturnsData;
}

function fmt(n: number): string {
    return n % 1 === 0
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MonthlyTable({ monthly, label, color }: { monthly: MonthlyBreakdown[]; label: string; color: 'red' | 'amber' }) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    function toggle(m: string) { setExpanded(prev => { const n = new Set(prev); n.has(m) ? n.delete(m) : n.add(m); return n; }); }

    const headerCls = color === 'red'
        ? 'bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400'
        : 'bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400';

    return (
        <SpatialCard title={`${label} (${monthly.length} شهر)`} icon={<RotateCcw className="w-4 h-4" />}>
            {monthly.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-white/30 gap-2">
                    <RotateCcw className="w-10 h-10 opacity-30" />
                    <p className="font-bold text-sm">لا توجد بيانات</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-[16px]">
                        <thead>
                            <tr className={headerCls}>
                                {['الشهر', 'عدد', 'الإجمالي', ''].map(h => (
                                    <th key={h} className="text-right px-4 py-4 text-sm font-black uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {monthly.map(m => (
                                <>
                                    <tr key={m.month} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                        <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{m.month}</td>
                                        <td className="px-4 py-4 font-bold text-slate-600 dark:text-white/60">{m.count}</td>
                                        <td className={`px-4 py-3 font-black ${color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>{fmt(m.total)}</td>
                                        <td className="px-4 py-4">
                                            <button onClick={() => toggle(m.month)}
                                                className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/70 transition-colors">
                                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded.has(m.month) ? 'rotate-90' : ''}`} />
                                                تفاصيل
                                            </button>
                                        </td>
                                    </tr>
                                    {expanded.has(m.month) && (
                                        <tr key={`${m.month}-d`}>
                                            <td colSpan={4} className="px-6 py-4 bg-black/2 dark:bg-white/2 rounded-[16px] my-2">
                                                <table className="w-full text-[15px]">
                                                    <thead>
                                                        <tr className="border-b border-black/5 dark:border-white/5">
                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">التاريخ</th>
                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">عدد</th>
                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">الإجمالي</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                        {m.days.map((d, i) => (
                                                            <tr key={i} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group">
                                                                <td className="py-3 px-4 font-bold text-slate-600 dark:text-white/60">{d.date}</td>
                                                                <td className="py-3 px-4 font-bold text-slate-500 dark:text-white/50">{d.count}</td>
                                                                <td className="py-3 px-4 font-black text-slate-800 dark:text-white">{fmt(d.total)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-black/10 dark:border-white/10">
                                <td className="px-4 py-4 font-black text-slate-500 dark:text-white/40 text-xs uppercase">الإجمالي</td>
                                <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{monthly.reduce((s, m) => s + m.count, 0)}</td>
                                <td className={`px-4 py-3 font-black ${color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                    {fmt(monthly.reduce((s, m) => s + m.total, 0))}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </SpatialCard>
    );
}

export default function Returns({ users, customers, suppliers, categories, filters, data }: Props) {
    const [filterOpen,  setFilterOpen]  = useState(false);
    const [dateFrom,    setDateFrom]    = useState(filters.dateFrom ?? '');
    const [dateTo,      setDateTo]      = useState(filters.dateTo ?? '');
    const [userId,      setUserId]      = useState(filters.userId ? String(filters.userId) : '');
    const [customerId,  setCustomerId]  = useState(filters.customerId ? String(filters.customerId) : '');
    const [supplierId,  setSupplierId]  = useState(filters.supplierId ? String(filters.supplierId) : '');
    const [categoryId,  setCategoryId]  = useState(filters.categoryId ? String(filters.categoryId) : '');

    const hasFilter = dateFrom || dateTo || userId || customerId || supplierId || categoryId;

    function buildParams() {
        const p: Record<string, string> = {};
        if (dateFrom)   p.date_from   = dateFrom;
        if (dateTo)     p.date_to     = dateTo;
        if (userId)     p.user_id     = userId;
        if (customerId) p.customer_id = customerId;
        if (supplierId) p.supplier_id = supplierId;
        if (categoryId) p.category_id = categoryId;
        return p;
    }

    function search() { router.get('/reports/returns', buildParams(), { preserveScroll: true }); }
    function reset() {
        setDateFrom(''); setDateTo(''); setUserId(''); setCustomerId(''); setSupplierId(''); setCategoryId('');
        router.get('/reports/returns', {}, { preserveScroll: true });
    }
    function buildExportUrl(format: 'excel' | 'pdf') {
        return `/reports/returns/${format}?${new URLSearchParams(buildParams()).toString()}`;
    }

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
            <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={dateTo}   onChange={setDateTo} />
            <ModernSelect label="المستخدم" placeholder="الكل"
                options={[{ label: 'الكل' }, ...users.map(u => ({ label: u.name }))]}
                defaultValue={userId ? (users.find(u => String(u.id) === userId)?.name ?? '') : 'الكل'}
                onSelect={val => setUserId(val === 'الكل' ? '' : String(users.find(u => u.name === val)?.id ?? ''))}
            />
            <ModernSelect label="العميل" placeholder="الكل"
                options={[{ label: 'الكل' }, ...customers.map(c => ({ label: c.name }))]}
                defaultValue={customerId ? (customers.find(c => String(c.id) === customerId)?.name ?? '') : 'الكل'}
                onSelect={val => setCustomerId(val === 'الكل' ? '' : String(customers.find(c => c.name === val)?.id ?? ''))}
            />
            <ModernSelect label="المورد" placeholder="الكل"
                options={[{ label: 'الكل' }, ...suppliers.map(s => ({ label: s.name }))]}
                defaultValue={supplierId ? (suppliers.find(s => String(s.id) === supplierId)?.name ?? '') : 'الكل'}
                onSelect={val => setSupplierId(val === 'الكل' ? '' : String(suppliers.find(s => s.name === val)?.id ?? ''))}
            />
            <ModernSelect label="التصنيف" placeholder="الكل"
                options={[{ label: 'الكل' }, ...categories.map(c => ({ label: c.name }))]}
                defaultValue={categoryId ? (categories.find(c => String(c.id) === categoryId)?.name ?? '') : 'الكل'}
                onSelect={val => setCategoryId(val === 'الكل' ? '' : String(categories.find(c => c.name === val)?.id ?? ''))}
            />
            <button onClick={search}
                className="w-full h-11 rounded-[14px] bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                <Search className="w-4 h-4" /> عرض التقرير
            </button>
            {hasFilter && (
                <button onClick={reset}
                    className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                    إعادة تعيين
                </button>
            )}
        </div>
    );

    return (
        <AppShell pageTitle="تقرير المرتجعات">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">المرتجعات</h1>
                    <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">مرتجعات العملاء والموردين مقارنةً بالمبيعات</p>
                </div>

                <div className="lg:hidden">
                    <button onClick={() => setFilterOpen(p => !p)}
                        className="w-full flex items-center justify-between px-5 h-12 rounded-[18px] spatial-input font-bold text-[14px] text-slate-700 dark:text-white/70">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4" /> فلترة
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
                    <div className="flex-1 min-w-0 flex flex-col gap-6">

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="spatial-card p-4 flex flex-col gap-1">
                                <p className="text-xs font-black text-red-500 uppercase tracking-widest">مرتجعات العملاء</p>
                                <p className="text-2xl font-black text-red-600 dark:text-red-400">{fmt(data.customerReturnsTotal)}</p>
                                <p className="text-xs font-bold text-slate-400 dark:text-white/30">{data.customerReturnsCount} مرتجع</p>
                            </div>
                            <div className="spatial-card p-4 flex flex-col gap-1">
                                <p className="text-xs font-black text-amber-600 uppercase tracking-widest">مرتجعات الموردين</p>
                                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{fmt(data.supplierReturnsTotal)}</p>
                                <p className="text-xs font-bold text-slate-400 dark:text-white/30">{data.supplierReturnsCount} مرتجع</p>
                            </div>
                            <div className="spatial-card p-4 flex flex-col gap-1">
                                <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">إجمالي المبيعات</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{fmt(data.totalSales)}</p>
                                {data.returnRate !== null && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${data.returnRate > 10 ? 'bg-red-500/10 text-red-600' : data.returnRate > 5 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                            نسبة المرتجعات: {data.returnRate}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Export */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <a href={buildExportUrl('excel')} target="_blank"
                                className="flex items-center gap-2 px-4 h-10 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm">
                                <FileSpreadsheet className="w-4 h-4" /> Excel
                            </a>
                            <a href={buildExportUrl('pdf')} target="_blank"
                                className="flex items-center gap-2 px-4 h-10 rounded-[14px] bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                <FileText className="w-4 h-4" /> PDF
                            </a>
                            <a href={`/reports/returns/details?${new URLSearchParams(buildParams()).toString()}`}
                                className="flex items-center gap-2 px-4 h-10 rounded-[14px] bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all font-bold text-sm">
                                <List className="w-4 h-4" /> التفاصيل
                            </a>
                        </div>

                        {/* Tables */}
                        <MonthlyTable monthly={data.customerMonthly} label="مرتجعات العملاء" color="red" />
                        <MonthlyTable monthly={data.supplierMonthly} label="مرتجعات الموردين" color="amber" />
                    </div>

                    <div className="hidden lg:block w-[360px] shrink-0">
                        <SpatialCard title="فلترة" icon={<SlidersHorizontal className="w-4 h-4" />}>
                            <FilterPanel />
                        </SpatialCard>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
