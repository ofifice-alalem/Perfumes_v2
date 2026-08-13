import { router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import {
    RotateCcw,
    SlidersHorizontal,
    ChevronRight,
    Search,
    FileSpreadsheet,
    FileText,
    ArrowRight,
    X,
    Users,
    Truck,
    Package
} from 'lucide-react';

interface User     { id: number; name: string; }
interface Customer { id: number; name: string; }
interface Supplier { id: number; name: string; }
interface Category { id: number; name: string; }

interface ReturnItem   { product_name: string; quantity: number; unit_price: number; size_label: string | null; count: number; line_total: number; }
interface ReturnEntry  { id: number; total: number; date: string; items: ReturnItem[]; }
interface EntityEntry  {
    entity_id: number; entity_name: string; entity_type: 'customer' | 'supplier';
    return_count: number; total_amount: number; returns: ReturnEntry[];
}

interface Props {
    users: User[]; customers: Customer[]; suppliers: Supplier[]; categories: Category[]; products: { id: number; name: string; }[];
    filters: { dateFrom: string | null; dateTo: string | null; userId: number | null; customerId: number | null; supplierId: number | null; categoryId: number | null; type: string; searchName?: string; };
    data: EntityEntry[];
}

function fmt(n: number): string {
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function ReturnsDetails({ users, customers, suppliers, categories, products, filters, data }: Props) {
    const [drawerOpen, setDrawerOpen]             = useState(false);
    const [mounted, setMounted]                   = useState(false);
    const [dateFrom, setDateFrom]                 = useState(filters.dateFrom ?? '');
    const [dateTo, setDateTo]                     = useState(filters.dateTo ?? '');
    const [userId, setUserId]                     = useState(filters.userId ? String(filters.userId) : '');
    const [customerId, setCustomerId]             = useState(filters.customerId ? String(filters.customerId) : '');
    const [supplierId, setSupplierId]             = useState(filters.supplierId ? String(filters.supplierId) : '');
    const [categoryId, setCategoryId]             = useState(filters.categoryId ? String(filters.categoryId) : '');
    const [type, setType]                         = useState(filters.type ?? 'all');
    const [searchName, setSearchName]             = useState(filters.searchName ?? '');
    const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
    const [expandedReturns, setExpandedReturns]   = useState<Set<number>>(new Set());

    useEffect(() => { setMounted(true); }, []);

    function toggleEntity(key: string) {
        setExpandedEntities(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
    }
    function toggleReturn(id: number) {
        setExpandedReturns(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }

    const activeFilterCount = [
        dateFrom,
        dateTo,
        userId,
        customerId,
        supplierId,
        categoryId,
        type !== 'all',
        searchName
    ].filter(Boolean).length;

    function buildParams() {
        const p: Record<string, string> = {};
        if (dateFrom)        p.date_from   = dateFrom;
        if (dateTo)          p.date_to     = dateTo;
        if (userId)          p.user_id     = userId;
        if (customerId)      p.customer_id = customerId;
        if (supplierId)      p.supplier_id = supplierId;
        if (categoryId)      p.category_id = categoryId;
        if (type !== 'all')  p.type        = type;
        if (searchName)      p.search_name = searchName;
        return p;
    }

    function handleSearch() {
        setDrawerOpen(false);
        router.get('/reports/returns/details', buildParams(), { preserveScroll: true });
    }

    function handleReset() {
        setDateFrom(''); setDateTo(''); setUserId(''); setCustomerId(''); setSupplierId(''); setCategoryId(''); setType('all'); setSearchName('');
        setDrawerOpen(false);
        router.get('/reports/returns/details', {}, { preserveScroll: true });
    }

    function buildExportUrl(format: 'excel' | 'pdf') {
        return `/reports/returns/details/${format}?${new URLSearchParams(buildParams()).toString()}`;
    }

    const grandTotal = data.reduce((s, e) => s + e.total_amount, 0);
    const grandCount = data.reduce((s, e) => s + e.return_count, 0);

    const entityColor = (t: string) => t === 'customer'
        ? { badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20', text: 'text-red-600 dark:text-red-400' }
        : { badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20', text: 'text-amber-600 dark:text-amber-400' };

    const FilterControls = () => (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
                <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
                <DateFilterInput label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">نوع الجهة</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        ['all', 'الكل'],
                        ['customer', 'عملاء'],
                        ['supplier', 'موردين']
                    ].map(([v, l]) => (
                        <button
                            key={v}
                            onClick={() => setType(v)}
                            className={`h-12 rounded-[14px] font-black text-sm border-2 transition-all cursor-pointer ${
                                type === v
                                    ? 'bg-primary border-primary text-white shadow-md'
                                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary/40'
                            }`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            <ModernSelect
                label="البحث باسم المنتج"
                placeholder="الكل (اختر أو اكتب للبحث)"
                options={[{ label: 'الكل' }, ...products.map(p => ({ label: p.name }))]}
                defaultValue={searchName}
                onSelect={val => setSearchName(val === 'الكل' ? '' : val)}
                allowFreeText={true}
            />

            <div className="flex flex-col gap-4">
                <ModernSelect
                    label="المستخدم"
                    placeholder="الكل"
                    options={[{ label: 'الكل' }, ...users.map(u => ({ label: u.name }))]}
                    defaultValue={userId ? (users.find(u => String(u.id) === userId)?.name ?? '') : 'الكل'}
                    onSelect={val => setUserId(val === 'الكل' ? '' : String(users.find(u => u.name === val)?.id ?? ''))}
                />

                <ModernSelect
                    label="العميل"
                    placeholder="الكل"
                    options={[{ label: 'الكل' }, ...customers.map(c => ({ label: c.name }))]}
                    defaultValue={customerId ? (customers.find(c => String(c.id) === customerId)?.name ?? '') : 'الكل'}
                    onSelect={val => setCustomerId(val === 'الكل' ? '' : String(customers.find(c => c.name === val)?.id ?? ''))}
                />

                <ModernSelect
                    label="المورد"
                    placeholder="الكل"
                    options={[{ label: 'الكل' }, ...suppliers.map(s => ({ label: s.name }))]}
                    defaultValue={supplierId ? (suppliers.find(s => String(s.id) === supplierId)?.name ?? '') : 'الكل'}
                    onSelect={val => setSupplierId(val === 'الكل' ? '' : String(suppliers.find(s => s.name === val)?.id ?? ''))}
                />

                <ModernSelect
                    label="التصنيف"
                    placeholder="الكل"
                    options={[{ label: 'الكل' }, ...categories.map(c => ({ label: c.name }))]}
                    defaultValue={categoryId ? (categories.find(c => String(c.id) === categoryId)?.name ?? '') : 'الكل'}
                    onSelect={val => setCategoryId(val === 'الكل' ? '' : String(categories.find(c => c.name === val)?.id ?? ''))}
                />
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t-2 border-slate-200/60 dark:border-slate-800/60">
                <button
                    onClick={handleSearch}
                    className="w-full h-14 rounded-[18px] bg-primary text-white font-black text-base shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                    <Search className="w-5 h-5" /> عرض التقرير التفصيلي
                </button>
                {activeFilterCount > 0 && (
                    <button
                        onClick={handleReset}
                        className="w-full h-12 rounded-[16px] bg-slate-200/70 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-300 font-black text-sm active:scale-98 transition-all cursor-pointer"
                    >
                        إعادة تعيين الفلاتر
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <AppShell pageTitle="تفاصيل المرتجعات">
            <div className="flex flex-col gap-6 pb-24">

                {/* Back Link & Header */}
                <div className="flex items-center gap-3">
                    <a
                        href="/reports/returns"
                        className="flex items-center gap-2 h-10 px-4 rounded-[14px] bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-primary hover:text-white font-black text-sm transition-all active:scale-95"
                    >
                        <ArrowRight className="w-4 h-4" /> العودة للتقرير العام
                    </a>
                </div>

                {/* Top Header Banner */}
                <div className="spatial-card p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="flex items-center gap-5 z-10">
                        <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-red-500/20 to-amber-500/20 border-2 border-red-500/30 flex items-center justify-center text-red-500 shadow-inner">
                            <RotateCcw className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    تقرير تفاصيل المرتجعات
                                </h1>
                                {activeFilterCount > 0 && (
                                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-black text-xs border border-primary/20">
                                        {activeFilterCount} فلتر نشط
                                    </span>
                                )}
                            </div>
                            <p className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 mt-1">
                                تفاصيل عمليات الارجاع مقسمة بالجهات والأصناف
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto z-10">
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="flex-1 md:flex-none h-14 px-7 rounded-[20px] bg-primary text-white font-black text-base shadow-xl shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                        >
                            <SlidersHorizontal className="w-5 h-5" />
                            <span>تصفية التفاصيل</span>
                            {activeFilterCount > 0 && (
                                <span className="w-6 h-6 rounded-full bg-white text-primary text-xs font-black flex items-center justify-center shadow">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Summary Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="spatial-card p-6 border-r-4 border-r-primary flex flex-col justify-between gap-3">
                        <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full w-fit">
                            إجمالي الجهات
                        </span>
                        <div>
                            <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                {data.length}
                            </div>
                            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                                جهة مسجلة في التقرير
                            </div>
                        </div>
                    </div>

                    <div className="spatial-card p-6 border-r-4 border-r-red-500 flex flex-col justify-between gap-3">
                        <span className="text-xs font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-3 py-1 rounded-full w-fit">
                            عدد المرتجعات
                        </span>
                        <div>
                            <div className="text-3xl sm:text-4xl font-black text-red-600 dark:text-red-400 tracking-tight">
                                {grandCount}
                            </div>
                            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                                عملية ارجاع تفصيلية
                            </div>
                        </div>
                    </div>

                    <div className="spatial-card p-6 border-r-4 border-r-amber-500 flex flex-col justify-between gap-3">
                        <span className="text-xs font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full w-fit">
                            إجمالي قيمة المرتجعات
                        </span>
                        <div>
                            <div className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                                {fmt(grandTotal)}
                            </div>
                            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                                دينار ليبي
                            </div>
                        </div>
                    </div>
                </div>

                {/* Export Bar */}
                <div className="spatial-card p-4 flex items-center gap-3">
                    <a
                        href={buildExportUrl('excel')}
                        target="_blank"
                        rel="noreferrer"
                        className="h-12 px-6 rounded-[16px] bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-sm flex items-center gap-2.5 active:scale-95"
                    >
                        <FileSpreadsheet className="w-5 h-5" /> تصدير Excel
                    </a>
                    <a
                        href={buildExportUrl('pdf')}
                        target="_blank"
                        rel="noreferrer"
                        className="h-12 px-6 rounded-[16px] bg-red-500/10 border-2 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all font-black text-sm flex items-center gap-2.5 active:scale-95"
                    >
                        <FileText className="w-5 h-5" /> تصدير PDF
                    </a>
                </div>

                {/* Entities List */}
                <SpatialCard title={`الجهات وحركات المرتجعات (${data.length})`} icon={<RotateCcw className="w-5 h-5 text-primary" />}>
                    {data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                            <RotateCcw className="w-12 h-12 opacity-30" />
                            <p className="font-black text-base">لا توجد تفاصيل مرتجعات مطابقة</p>
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-slate-200/70 dark:divide-slate-800">
                            {data.map(entity => {
                                const key = `${entity.entity_type}-${entity.entity_id}`;
                                const clr = entityColor(entity.entity_type);
                                const prefix = entity.entity_type === 'customer' ? 'RET#' : 'PRET#';
                                const isExp = expandedEntities.has(key);

                                return (
                                    <div key={key} className="py-2">
                                        <button
                                            onClick={() => toggleEntity(key)}
                                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 rounded-[18px] cursor-pointer transition-all text-right"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-[14px] bg-slate-200/80 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                                                    <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isExp ? 'rotate-90' : ''}`} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2.5">
                                                        <p className="font-black text-lg text-slate-900 dark:text-white">{entity.entity_name}</p>
                                                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${clr.badge}`}>
                                                            {entity.entity_type === 'customer' ? 'عميل' : 'مورد'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                                        {entity.return_count} عملية مرتجع
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500">الإجمالي</p>
                                                <p className={`font-black text-xl ${clr.text}`}>{fmt(entity.total_amount)}</p>
                                            </div>
                                        </button>

                                        {isExp && (
                                            <div className="mt-3 p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-900/60 rounded-[20px] border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in fade-in duration-200">
                                                {entity.returns.map(r => {
                                                    const isRetExp = expandedReturns.has(r.id);
                                                    return (
                                                        <div key={r.id} className="bg-white dark:bg-slate-800 rounded-[16px] border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                                                            <div
                                                                onClick={() => toggleReturn(r.id)}
                                                                className="flex items-center justify-between cursor-pointer"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`font-black text-base ${clr.text}`}>
                                                                        {prefix}{r.id}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                                        {r.date.substring(0, 10)}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-4">
                                                                    <span className={`font-black text-lg ${clr.text}`}>
                                                                        {fmt(r.total)}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        className="w-9 h-9 rounded-[12px] bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300"
                                                                    >
                                                                        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isRetExp ? 'rotate-90' : ''}`} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {isRetExp && (
                                                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                                                                    {r.items.map((item, i) => (
                                                                        <div key={i} className="flex items-center justify-between p-3 rounded-[12px] bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="w-8 h-8 rounded-[10px] bg-primary/10 text-primary font-black text-sm flex items-center justify-center">
                                                                                    {item.count}
                                                                                </span>
                                                                                <div>
                                                                                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                                                                                        {item.product_name}
                                                                                    </p>
                                                                                    {item.size_label && (
                                                                                        <span className="text-xs font-black text-primary">
                                                                                            {item.size_label}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            <div className="text-left">
                                                                                <p className="font-black text-slate-900 dark:text-white text-sm">
                                                                                    {fmt(item.line_total)}
                                                                                </p>
                                                                                <p className="text-xs font-bold text-slate-400">
                                                                                    × {fmt(item.unit_price)}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </SpatialCard>
            </div>

            {/* Filter Drawer Portal */}
            {mounted && drawerOpen && createPortal(
                <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
                        onClick={() => setDrawerOpen(false)}
                    />
                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-lg bg-white dark:bg-slate-900 shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col">
                            {/* Drawer Header */}
                            <div className="px-6 sm:px-8 py-6 border-b-2 border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-[22px] bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary shadow-md">
                                        <RotateCcw className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">تصفية تفاصيل المرتجعات</h3>
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                            تحديد الفترات والجهات والمنتجات
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDrawerOpen(false)}
                                    className="w-14 h-14 rounded-[20px] bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer border-2 border-slate-300 dark:border-slate-700 active:scale-95 shrink-0"
                                >
                                    <X className="w-7 h-7" />
                                </button>
                            </div>

                            {/* Drawer Body */}
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                                <FilterControls />
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </AppShell>
    );
}
