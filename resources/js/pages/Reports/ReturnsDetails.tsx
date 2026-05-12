import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { RotateCcw, SlidersHorizontal, ChevronDown, ChevronRight, Search, FileSpreadsheet, FileText, ArrowRight } from 'lucide-react';

interface User     { id: number; name: string; }
interface Customer { id: number; name: string; }
interface Supplier { id: number; name: string; }
interface Category { id: number; name: string; }

interface ReturnItem   { product_name: string; quantity: number; unit_price: number; size_label: string | null; }
interface ReturnEntry  { id: number; total: number; date: string; items: ReturnItem[]; }
interface EntityEntry  {
    entity_id: number; entity_name: string; entity_type: 'customer' | 'supplier';
    return_count: number; total_amount: number; returns: ReturnEntry[];
}

interface Props {
    users: User[]; customers: Customer[]; suppliers: Supplier[]; categories: Category[];
    filters: { dateFrom: string | null; dateTo: string | null; userId: number | null; customerId: number | null; supplierId: number | null; categoryId: number | null; type: string; };
    data: EntityEntry[];
}

function fmt(n: number): string {
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function ReturnsDetails({ users, customers, suppliers, categories, filters, data }: Props) {
    const [filterOpen,       setFilterOpen]       = useState(false);
    const [dateFrom,         setDateFrom]         = useState(filters.dateFrom ?? '');
    const [dateTo,           setDateTo]           = useState(filters.dateTo ?? '');
    const [userId,           setUserId]           = useState(filters.userId ? String(filters.userId) : '');
    const [customerId,       setCustomerId]       = useState(filters.customerId ? String(filters.customerId) : '');
    const [supplierId,       setSupplierId]       = useState(filters.supplierId ? String(filters.supplierId) : '');
    const [categoryId,       setCategoryId]       = useState(filters.categoryId ? String(filters.categoryId) : '');
    const [type,             setType]             = useState(filters.type ?? 'all');
    const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
    const [expandedReturns,  setExpandedReturns]  = useState<Set<number>>(new Set());

    function toggleEntity(key: string) {
        setExpandedEntities(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
    }
    function toggleReturn(id: number) {
        setExpandedReturns(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }

    const hasFilter = dateFrom || dateTo || userId || customerId || supplierId || categoryId || type !== 'all';

    function buildParams() {
        const p: Record<string, string> = {};
        if (dateFrom)        p.date_from   = dateFrom;
        if (dateTo)          p.date_to     = dateTo;
        if (userId)          p.user_id     = userId;
        if (customerId)      p.customer_id = customerId;
        if (supplierId)      p.supplier_id = supplierId;
        if (categoryId)      p.category_id = categoryId;
        if (type !== 'all')  p.type        = type;
        return p;
    }

    function search() { router.get('/reports/returns/details', buildParams(), { preserveScroll: true }); }
    function reset() {
        setDateFrom(''); setDateTo(''); setUserId(''); setCustomerId(''); setSupplierId(''); setCategoryId(''); setType('all');
        router.get('/reports/returns/details', {}, { preserveScroll: true });
    }
    function buildExportUrl(format: 'excel' | 'pdf') {
        return `/reports/returns/details/${format}?${new URLSearchParams(buildParams()).toString()}`;
    }

    const grandTotal = data.reduce((s, e) => s + e.total_amount, 0);
    const grandCount = data.reduce((s, e) => s + e.return_count, 0);

    const entityColor = (t: string) => t === 'customer'
        ? { badge: 'bg-red-500/10 text-red-600 dark:text-red-400', border: 'border-red-500/20', text: 'text-red-600 dark:text-red-400' }
        : { badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', text: 'text-amber-600 dark:text-amber-400' };

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
            <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={dateTo}   onChange={setDateTo} />
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">النوع</label>
                <div className="flex gap-2">
                    {[['all', 'الكل'], ['customer', 'عملاء'], ['supplier', 'موردين']].map(([v, l]) => (
                        <button key={v} onClick={() => setType(v)}
                            className={`flex-1 h-10 rounded-[12px] font-bold text-sm border-2 transition-all ${type === v ? 'bg-primary border-primary text-white' : 'border-black/10 dark:border-white/10 text-slate-500 dark:text-white/50 hover:border-primary/40'}`}>
                            {l}
                        </button>
                    ))}
                </div>
            </div>
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
        <AppShell pageTitle="تفاصيل المرتجعات">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">

                <div className="flex items-center gap-3">
                    <a href="/reports/returns" className="flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-primary transition-colors">
                        <ArrowRight className="w-4 h-4" /> تقرير المرتجعات
                    </a>
                    <span className="text-slate-300 dark:text-white/20">/</span>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">تفاصيل المرتجعات</h1>
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

                        {/* Summary */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="spatial-card p-4 flex flex-col gap-1">
                                <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">عدد الجهات</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{data.length}</p>
                            </div>
                            <div className="spatial-card p-4 flex flex-col gap-1">
                                <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">عدد المرتجعات</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{grandCount}</p>
                            </div>
                        </div>

                        {/* Export */}
                        <div className="flex items-center gap-2">
                            <a href={buildExportUrl('excel')} target="_blank"
                                className="flex items-center gap-2 px-4 h-10 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm">
                                <FileSpreadsheet className="w-4 h-4" /> Excel
                            </a>
                            <a href={buildExportUrl('pdf')} target="_blank"
                                className="flex items-center gap-2 px-4 h-10 rounded-[14px] bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                <FileText className="w-4 h-4" /> PDF
                            </a>
                        </div>

                        {/* Entities */}
                        <SpatialCard title={`الجهات (${data.length})`} icon={<RotateCcw className="w-4 h-4" />}>
                            {data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                    <RotateCcw className="w-12 h-12 opacity-30" />
                                    <p className="font-bold">لا توجد بيانات</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-black/5 dark:divide-white/5">
                                    {data.map(entity => {
                                        const key = `${entity.entity_type}-${entity.entity_id}`;
                                        const clr = entityColor(entity.entity_type);
                                        const prefix = entity.entity_type === 'customer' ? 'RET#' : 'PRET#';
                                        return (
                                            <div key={key}>
                                                <button onClick={() => toggleEntity(key)}
                                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/3 dark:hover:bg-white/3 transition-colors text-right">
                                                    <div className="flex items-center gap-3">
                                                        <ChevronRight className={`w-4 h-4 text-primary transition-transform shrink-0 ${expandedEntities.has(key) ? 'rotate-90' : ''}`} />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-black text-slate-800 dark:text-white">{entity.entity_name}</p>
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${clr.badge}`}>
                                                                    {entity.entity_type === 'customer' ? 'عميل' : 'مورد'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-400 dark:text-white/40">{entity.return_count} مرتجع</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-slate-400 dark:text-white/40">الإجمالي</p>
                                                        <p className={`font-black ${clr.text}`}>{fmt(entity.total_amount)}</p>
                                                    </div>
                                                </button>

                                                {expandedEntities.has(key) && (
                                                    <div className="bg-black/2 dark:bg-white/2 px-4 pb-3">
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="border-b border-black/5 dark:border-white/5">
                                                                        <th className="text-right py-2 px-3 text-xs font-black text-slate-400 dark:text-white/30">رقم المرتجع</th>
                                                                        <th className="text-right py-2 px-3 text-xs font-black text-slate-400 dark:text-white/30">التاريخ</th>
                                                                        <th className="text-right py-2 px-3 text-xs font-black text-slate-400 dark:text-white/30">الإجمالي</th>
                                                                        <th className="py-2 px-3"></th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                                    {entity.returns.map(r => (
                                                                        <>
                                                                            <tr key={r.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                                                                <td className={`py-2 px-3 font-black ${clr.text}`}>{prefix}{r.id}</td>
                                                                                <td className="py-2 px-3 font-bold text-slate-500 dark:text-white/50">{r.date.substring(0, 10)}</td>
                                                                                <td className={`py-2 px-3 font-black ${clr.text}`}>{fmt(r.total)}</td>
                                                                                <td className="py-2 px-3">
                                                                                    <button onClick={() => toggleReturn(r.id)}
                                                                                        className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/70 transition-colors whitespace-nowrap">
                                                                                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedReturns.has(r.id) ? 'rotate-90' : ''}`} />
                                                                                        تفاصيل
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                            {expandedReturns.has(r.id) && (
                                                                                <tr key={`${r.id}-items`}>
                                                                                    <td colSpan={4} className="px-4 pt-1 pb-3 bg-black/2 dark:bg-white/2">
                                                                                        <div className="hidden sm:grid grid-cols-[60px_2fr_60px_80px_90px] gap-2 px-3 py-2 text-xs font-bold text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-slate-800/50 rounded-[10px] border border-slate-200/50 dark:border-slate-700/50 mb-1.5">
                                                                                            <span className="text-center">عدد</span>
                                                                                            <span>المنتج</span>
                                                                                            <span className="text-center">الحجم</span>
                                                                                            <span className="text-center">السعر</span>
                                                                                            <span className="text-center">الإجمالي</span>
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-1.5">
                                                                                            {r.items.map((item, i) => (
                                                                                                <div key={i}>
                                                                                                    <div className="hidden sm:grid grid-cols-[60px_2fr_60px_80px_90px] gap-2 px-3 py-2.5 rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all shadow-sm">
                                                                                                        <div className="flex items-center justify-center">
                                                                                                            <span className="w-9 h-8 rounded-[8px] flex items-center justify-center font-black text-sm bg-primary/10 text-primary">{fmt(item.quantity)}</span>
                                                                                                        </div>
                                                                                                        <div className="flex flex-col justify-center min-w-0">
                                                                                                            <span className="font-bold text-slate-800 dark:text-white text-sm truncate">{item.product_name}</span>
                                                                                                        </div>
                                                                                                        <div className="flex items-center justify-center">
                                                                                                            {item.size_label ? <span className="text-xs font-black text-white bg-primary px-2 py-1 rounded-full">{item.size_label}</span> : <span className="text-xs text-slate-400">--</span>}
                                                                                                        </div>
                                                                                                        <div className="flex items-center justify-center">
                                                                                                            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{fmt(item.unit_price)}</span>
                                                                                                        </div>
                                                                                                        <div className="flex items-center justify-center">
                                                                                                            <span className="font-black text-slate-800 dark:text-white text-sm">{fmt(item.quantity * item.unit_price)}</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="sm:hidden flex items-center gap-2 p-2.5 rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                                                        <span className="w-9 h-9 rounded-[8px] flex items-center justify-center font-black text-sm shrink-0 bg-primary/10 text-primary">{fmt(item.quantity)}</span>
                                                                                                        <div className="flex-1 min-w-0">
                                                                                                            <p className="font-bold text-slate-800 dark:text-white text-xs truncate">{item.product_name}</p>
                                                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                                                <span className="text-[10px] font-bold text-slate-400 dark:text-white/30">× {fmt(item.unit_price)}</span>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        <span className="font-black text-slate-800 dark:text-white text-sm shrink-0">{fmt(item.quantity * item.unit_price)}</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </>
                                                                    ))}
                                                                </tbody>
                                                                <tfoot>
                                                                    <tr className="border-t-2 border-black/10 dark:border-white/10">
                                                                        <td colSpan={2} className="py-2 px-3 font-black text-slate-500 dark:text-white/40 text-xs uppercase">الإجمالي</td>
                                                                        <td className={`py-2 px-3 font-black ${clr.text}`}>{fmt(entity.total_amount)}</td>
                                                                        <td></td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <div className="flex items-center justify-between px-4 py-3 bg-black/3 dark:bg-white/3">
                                        <p className="font-black text-slate-500 dark:text-white/40 text-xs uppercase">الإجمالي الكلي</p>
                                        <p className="font-black text-slate-800 dark:text-white">{fmt(grandTotal)}</p>
                                    </div>
                                </div>
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
        </AppShell>
    );
}
