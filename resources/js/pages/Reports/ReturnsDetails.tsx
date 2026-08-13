import { router, Link } from '@inertiajs/react';
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
    ArrowRight,
    Package,
    Star,
    X,
    Download,
    Receipt,
    Wallet,
    FileText,
    TrendingUp,
    Users,
    Truck
} from 'lucide-react';

interface User     { id: number; name: string; }
interface Customer { id: number; name: string; }
interface Supplier { id: number; name: string; }
interface Category { id: number; name: string; }

interface ReturnItem {
    product_name: string;
    quantity: number;
    unit_price: number;
    size_label: string | null;
    count: number;
    line_total: number;
    is_matched?: boolean;
}

interface ReturnEntry {
    id: number;
    total: number;
    date: string;
    items: ReturnItem[];
}

interface EntityEntry {
    entity_id: number;
    entity_name: string;
    entity_type: 'customer' | 'supplier';
    return_count: number;
    total_amount: number;
    returns: ReturnEntry[];
}

interface Props {
    users: User[];
    customers: Customer[];
    suppliers: Supplier[];
    categories: Category[];
    products: { id: number; name: string; }[];
    filters: {
        dateFrom: string | null; dateTo: string | null;
        userId: number | null; customerId: number | null;
        supplierId: number | null; categoryId: number | null;
        type: string; searchName?: string;
    };
    data: EntityEntry[];
}

function fmt(n: number | null | undefined): string {
    if (n === null || n === undefined) return '—';
    const isWhole = n % 1 === 0;
    return isWhole
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* =========================================================================
   RIGHT FILTER DRAWER
   ========================================================================= */
function FilterDrawer({
    isOpen,
    onClose,
    users,
    customers,
    suppliers,
    categories,
    products,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    userId,
    setUserId,
    customerId,
    setCustomerId,
    supplierId,
    setSupplierId,
    categoryId,
    setCategoryId,
    type,
    setType,
    searchName,
    setSearchName,
    onSearch,
    onReset
}: {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    customers: Customer[];
    suppliers: Supplier[];
    categories: Category[];
    products: { id: number; name: string; }[];
    dateFrom: string;
    setDateFrom: (v: string) => void;
    dateTo: string;
    setDateTo: (v: string) => void;
    userId: string;
    setUserId: (v: string) => void;
    customerId: string;
    setCustomerId: (v: string) => void;
    supplierId: string;
    setSupplierId: (v: string) => void;
    categoryId: string;
    setCategoryId: (v: string) => void;
    type: string;
    setType: (v: string) => void;
    searchName: string;
    setSearchName: (v: string) => void;
    onSearch: () => void;
    onReset: () => void;
}) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
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
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">خيارات تصفية المرتجعات</h3>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                    تحديد الفترات، الجهات، والأصناف
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-14 h-14 rounded-[20px] bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer border-2 border-slate-300 dark:border-slate-700 active:scale-95 shrink-0"
                        >
                            <X className="w-7 h-7" />
                        </button>
                    </div>

                    {/* Drawer Body */}
                    <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col gap-6">

                        {/* Date Filters */}
                        <div className="flex flex-col gap-5">
                            <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
                            <DateFilterInput label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
                        </div>

                        {/* Type Selector */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">نوع الجهة</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    ['all', 'الكل'],
                                    ['customer', 'عملاء'],
                                    ['supplier', 'موردين']
                                ].map(([v, l]) => (
                                    <button
                                        key={v}
                                        onClick={() => setType(v)}
                                        className={`h-12 rounded-[16px] font-black text-base border-2 transition-all cursor-pointer ${
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

                        {/* Search Product Name */}
                        <ModernSelect
                            label="البحث باسم المنتج"
                            placeholder="الكل (اختر أو اكتب للبحث)"
                            options={[{ label: 'الكل' }, ...products.map(p => ({ label: p.name }))]}
                            defaultValue={searchName}
                            onSelect={val => setSearchName(val === 'الكل' ? '' : val)}
                            allowFreeText={true}
                        />

                        {/* Select Dropdowns */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t-2 border-slate-200/60 dark:border-slate-800/60">
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
                    </div>

                    {/* Drawer Footer */}
                    <div className="p-6 sm:p-8 border-t-2 border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                        <button
                            onClick={onSearch}
                            className="w-full h-16 rounded-[20px] bg-primary text-white font-black text-lg shadow-xl shadow-primary/30 hover:bg-primary/90 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer"
                        >
                            <Search className="w-6 h-6" />
                            <span>تطبيق التصفية</span>
                        </button>
                        <button
                            onClick={onReset}
                            className="w-full h-12 rounded-[16px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-base transition-all active:scale-98 cursor-pointer"
                        >
                            إعادة تعيين الكل
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function ReturnsDetails({
    users,
    customers,
    suppliers,
    categories,
    products,
    filters,
    data
}: Props) {
    const [drawerOpen, setDrawerOpen]               = useState(false);
    const [dateFrom, setDateFrom]                   = useState(filters.dateFrom ?? '');
    const [dateTo, setDateTo]                       = useState(filters.dateTo ?? '');
    const [userId, setUserId]                       = useState(filters.userId ? String(filters.userId) : '');
    const [customerId, setCustomerId]               = useState(filters.customerId ? String(filters.customerId) : '');
    const [supplierId, setSupplierId]               = useState(filters.supplierId ? String(filters.supplierId) : '');
    const [categoryId, setCategoryId]               = useState(filters.categoryId ? String(filters.categoryId) : '');
    const [type, setType]                           = useState(filters.type ?? 'all');
    const [searchName, setSearchName]               = useState(filters.searchName ?? '');

    const [expandedEntities, setExpandedEntities]   = useState<Set<string>>(new Set());
    const [expandedReturns, setExpandedReturns]     = useState<Set<number>>(new Set());

    function toggleEntity(key: string) {
        setExpandedEntities(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }

    function toggleReturn(id: number) {
        setExpandedReturns(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
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
        setDateFrom('');
        setDateTo('');
        setUserId('');
        setCustomerId('');
        setSupplierId('');
        setCategoryId('');
        setType('all');
        setSearchName('');
        setDrawerOpen(false);
        router.get('/reports/returns/details', {}, { preserveScroll: true });
    }

    function buildExportUrl(format: 'excel' | 'pdf') {
        return `/reports/returns/details/${format}?${new URLSearchParams(buildParams()).toString()}`;
    }

    const grandTotal = data.reduce((s, e) => s + e.total_amount, 0);
    const grandCount = data.reduce((s, e) => s + e.return_count, 0);

    return (
        <AppShell pageTitle="تفاصيل المرتجعات">
            <div className="flex flex-col gap-6 pb-24">

                {/* Back Link & Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/reports/returns"
                        className="flex items-center gap-2 px-4 h-11 rounded-[14px] bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-primary hover:text-white font-black text-sm transition-all active:scale-95 border-2 border-slate-300 dark:border-slate-700"
                    >
                        <ArrowRight className="w-4 h-4" />
                        <span>العودة لتقرير المرتجعات العام</span>
                    </Link>
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
                                    تفاصيل مرتجعات الجهات والأصناف
                                </h1>
                                {activeFilterCount > 0 && (
                                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-black text-xs border border-primary/20">
                                        {activeFilterCount} فلتر نشط
                                    </span>
                                )}
                            </div>
                            <p className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 mt-1">
                                تفاصيل عمليات المرتجعات مقسمة بحسب الجهات وفواتير الارجاع والأصناف
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
                    {/* Entities Count */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">عدد الجهات</span>
                            <Users className="w-6 h-6 text-primary" />
                        </div>
                        <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{data.length}</span>
                    </SpatialCard>

                    {/* Returns Count */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-red-500/30 bg-red-500/5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-wider">إجمالي المرتجعات</span>
                            <Receipt className="w-6 h-6 text-red-500" />
                        </div>
                        <span className="text-3xl sm:text-4xl font-black text-red-600 dark:text-red-400">{grandCount}</span>
                    </SpatialCard>

                    {/* Grand Total */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-amber-500/30 bg-amber-500/5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">الإجمالي الكلي</span>
                            <Wallet className="w-6 h-6 text-amber-500" />
                        </div>
                        <span className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400">{fmt(grandTotal)} <span className="text-base font-bold">د.ل</span></span>
                    </SpatialCard>
                </div>

                {/* Main Content Spatial Card */}
                <SpatialCard
                    headerDot={false}
                    title={`جدول مرتجعات الجهات (${data.length} جهة)`}
                    icon={<RotateCcw className="w-7 h-7 text-primary" />}
                    action={
                        <div className="flex items-center gap-3 flex-wrap">
                            <a
                                href={buildExportUrl('excel')}
                                target="_blank"
                                rel="noreferrer"
                                className="h-12 px-5 rounded-[16px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white border-2 border-emerald-500/30 font-black text-base flex items-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer"
                                title="تصدير إكسيل"
                            >
                                <FileSpreadsheet className="w-5 h-5" />
                                <span className="hidden sm:inline">تصدير إكسيل</span>
                            </a>
                            <a
                                href={buildExportUrl('pdf')}
                                target="_blank"
                                rel="noreferrer"
                                className="h-12 px-5 rounded-[16px] bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500 hover:text-white border-2 border-rose-500/30 font-black text-base flex items-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer"
                                title="تصدير PDF"
                            >
                                <Download className="w-5 h-5" />
                                <span className="hidden sm:inline">تصدير PDF</span>
                            </a>
                            <Link
                                href="/reports/returns"
                                className="h-12 px-5 rounded-[16px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 font-black text-base flex items-center gap-2 transition-all active:scale-95 shadow-sm border-2 border-slate-300 dark:border-slate-700"
                            >
                                <TrendingUp className="w-5 h-5" />
                                <span className="hidden sm:inline">تقرير المرتجعات</span>
                            </Link>
                        </div>
                    }
                >
                    {data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
                            <RotateCcw className="w-14 h-14 opacity-30" />
                            <p className="font-bold text-xl">لا توجد مرتجعات مطابقة لخيارات البحث</p>
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-slate-100 dark:divide-slate-800/60">
                            {data.map(entity => {
                                const entityKey = `${entity.entity_type}-${entity.entity_id}`;
                                const isEntityExpanded = expandedEntities.has(entityKey);
                                const isCustomer = entity.entity_type === 'customer';
                                const prefix = isCustomer ? 'RET#' : 'PRET#';

                                return (
                                    <div key={entityKey}>
                                        {/* Entity Row Header */}
                                        <button
                                            type="button"
                                            onClick={() => toggleEntity(entityKey)}
                                            className="w-full flex items-center justify-between p-6 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors cursor-pointer text-right active:scale-99"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center transition-all ${
                                                    isEntityExpanded ? 'bg-primary text-white' : 'bg-primary/10 text-primary border border-primary/20'
                                                }`}>
                                                    <ChevronRight className={`w-6 h-6 transition-transform duration-300 ${isEntityExpanded ? 'rotate-90' : ''}`} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="font-black text-2xl text-slate-900 dark:text-white">{entity.entity_name}</h3>
                                                        <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                                                            isCustomer
                                                                ? 'bg-red-500/10 text-red-600 border-red-500/20'
                                                                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                        }`}>
                                                            {isCustomer ? 'عميل' : 'مورد'}
                                                        </span>
                                                    </div>
                                                    <span className="text-base font-bold text-slate-500 dark:text-slate-400 mt-0.5 inline-block">
                                                        {entity.return_count} حالة مرتجع
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-left">
                                                <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">الإجمالي</span>
                                                <span className={`text-2xl sm:text-3xl font-black ${isCustomer ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                    {fmt(entity.total_amount)} <span className="text-base font-bold text-slate-400">د.ل</span>
                                                </span>
                                            </div>
                                        </button>

                                        {/* Expanded Entity Returns */}
                                        {isEntityExpanded && (
                                            <div className="p-4 sm:p-6 bg-slate-200/50 dark:bg-slate-900/60 border-y-2 border-slate-300 dark:border-slate-700">
                                                <div className="p-6 sm:p-8 bg-white/90 dark:bg-slate-800/90 rounded-[28px] border-2 border-primary/30 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
                                                    
                                                    {/* Returns Sub-Table */}
                                                    <div className="overflow-x-auto rounded-[22px] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md">
                                                        <table className="w-full text-right border-collapse min-w-[750px]">
                                                            <thead>
                                                                <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-lg sm:text-xl font-black uppercase">
                                                                    <th className="p-5 rounded-r-[18px]">رقم المرتجع</th>
                                                                    <th className="p-5">التاريخ</th>
                                                                    <th className="p-5">الإجمالي</th>
                                                                    <th className="p-5 rounded-l-[18px] text-center">التفاصيل</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/80 font-black text-xl sm:text-2xl">
                                                                {entity.returns.map(ret => {
                                                                    const isReturnExpanded = expandedReturns.has(ret.id);
                                                                    return (
                                                                        <>
                                                                            <tr key={ret.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                                                                <td className="p-5 font-black text-primary flex items-center gap-2">
                                                                                    <Receipt className="w-5 h-5 text-primary/70 shrink-0" />
                                                                                    <span>{prefix}{ret.id}</span>
                                                                                </td>
                                                                                <td className="p-5 text-slate-600 dark:text-slate-300 font-bold whitespace-nowrap">{ret.date ? ret.date.substring(0, 10) : '—'}</td>
                                                                                <td className={`p-5 font-black whitespace-nowrap ${isCustomer ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                                                    {fmt(ret.total)} د.ل
                                                                                </td>
                                                                                <td className="p-5 text-center whitespace-nowrap">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => toggleReturn(ret.id)}
                                                                                        className={`px-5 py-2.5 rounded-[16px] border-2 font-black text-base inline-flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer ${
                                                                                            isReturnExpanded
                                                                                                ? 'bg-primary text-white border-primary'
                                                                                                : 'bg-primary/10 dark:bg-primary/20 text-primary border-primary/30 hover:bg-primary hover:text-white'
                                                                                        }`}
                                                                                    >
                                                                                        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isReturnExpanded ? 'rotate-90' : ''}`} />
                                                                                        <span>{isReturnExpanded ? 'إخفاء الأصناف' : 'عرض الأصناف'}</span>
                                                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                                                                            isReturnExpanded ? 'bg-white text-primary' : 'bg-primary text-white'
                                                                                        }`}>
                                                                                            {ret.items?.length || 0}
                                                                                        </span>
                                                                                    </button>
                                                                                </td>
                                                                            </tr>

                                                                            {/* Return Items Nested Row */}
                                                                            {isReturnExpanded && (
                                                                                <tr key={`${ret.id}-items`}>
                                                                                    <td colSpan={4} className="p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-800/70 border-y-2 border-slate-300 dark:border-slate-700">
                                                                                        <div className="flex flex-col gap-3">
                                                                                            <div className="flex items-center justify-between px-2 mb-1">
                                                                                                <h5 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                                                                                    <FileText className="w-5 h-5 text-primary" />
                                                                                                    <span>الأصناف المرجعة بالعملية #{prefix}{ret.id}</span>
                                                                                                </h5>
                                                                                            </div>

                                                                                            <div className="grid grid-cols-1 gap-3">
                                                                                                {ret.items.map((item, i) => (
                                                                                                    <div
                                                                                                        key={i}
                                                                                                        className={`p-5 rounded-[22px] border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-sm ${
                                                                                                            item.is_matched
                                                                                                                ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/40 shadow-amber-500/5'
                                                                                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-primary/40'
                                                                                                        }`}
                                                                                                    >
                                                                                                        <div className="flex items-center gap-4 min-w-0">
                                                                                                            <span className={`w-12 h-12 rounded-[16px] flex items-center justify-center font-black text-lg shrink-0 ${
                                                                                                                (item.count || 1) > 1
                                                                                                                    ? 'bg-blue-500/15 border-2 border-blue-500/30 text-blue-600 dark:text-blue-400'
                                                                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                                                                            }`}>
                                                                                                                {item.count || 1}×
                                                                                                            </span>
                                                                                                            <div className="flex flex-col min-w-0">
                                                                                                                <div className="flex items-center gap-2.5">
                                                                                                                    {item.is_matched && <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />}
                                                                                                                    <span className="font-black text-xl text-slate-900 dark:text-white truncate">
                                                                                                                        {item.product_name}
                                                                                                                    </span>
                                                                                                                    {item.size_label && (
                                                                                                                        <span className="px-3 py-0.5 rounded-full bg-primary text-white text-xs font-black shrink-0">
                                                                                                                            {item.size_label}
                                                                                                                        </span>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                                                                                                    السعر الفردي: {fmt(item.unit_price)} د.ل
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        </div>

                                                                                                        <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                                                                                                            <div className="flex items-center gap-2">
                                                                                                                <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase">الكمية</span>
                                                                                                                <span className="px-4 py-1.5 rounded-full bg-primary text-white font-black text-sm">{fmt(item.quantity)}</span>
                                                                                                            </div>

                                                                                                            <div className="text-left sm:text-right shrink-0">
                                                                                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-0.5">المبلغ الإجمالي</span>
                                                                                                                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                                                                                                    {fmt(item.line_total)} <span className="text-sm font-bold text-slate-400">د.ل</span>
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </SpatialCard>

            </div>

            {/* Filter Drawer */}
            <FilterDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                users={users}
                customers={customers}
                suppliers={suppliers}
                categories={categories}
                products={products}
                dateFrom={dateFrom}
                setDateFrom={setDateFrom}
                dateTo={dateTo}
                setDateTo={setDateTo}
                userId={userId}
                setUserId={setUserId}
                customerId={customerId}
                setCustomerId={setCustomerId}
                supplierId={supplierId}
                setSupplierId={setSupplierId}
                categoryId={categoryId}
                setCategoryId={setCategoryId}
                type={type}
                setType={setType}
                searchName={searchName}
                setSearchName={setSearchName}
                onSearch={handleSearch}
                onReset={handleReset}
            />
        </AppShell>
    );
}
