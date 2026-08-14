import { router, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect, ModernMultiSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { PdfExportButton } from '@/components/ui/PdfExportButton';
import {
    Users,
    SlidersHorizontal,
    ChevronRight,
    Search,
    FileSpreadsheet,
    ArrowRight,
    Package,
    Star,
    X,
    RotateCcw,
    Download,
    Receipt,
    Wallet,
    FileText,
    TrendingUp
} from 'lucide-react';

interface User          { id: number; name: string; }
interface Customer      { id: number; name: string; }
interface PaymentMethod { id: number; name: string; }
interface Category      { id: number; name: string; }

interface InvoiceItem {
    product_name: string;
    quantity: number;
    unit_price: number;
    count: number;
    line_total: number;
    is_matched?: boolean;
}

interface Invoice {
    id: number;
    total: number;
    date: string;
    items: InvoiceItem[];
}

interface CustomerEntry {
    customer_id: number;
    customer_name: string;
    invoice_count: number;
    total_amount: number;
    invoices: Invoice[];
}

interface Props {
    users: User[];
    customers: Customer[];
    paymentMethods: PaymentMethod[];
    categories: Category[];
    products: { id: number; name: string; }[];
    filters: {
        dateFrom: string | null; dateTo: string | null;
        userId: number | null; customerId: number | null;
        paymentMethodId: number | null; categoryId: number | null;
        productIds?: number[]; searchName?: string;
    };
    data: CustomerEntry[];
    includedProducts?: { id: number; name: string; }[];
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
    paymentMethods,
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
    paymentMethodId,
    setPaymentMethodId,
    categoryId,
    setCategoryId,
    multiSearch,
    setMultiSearch,
    onSearch,
    onReset
}: {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    customers: Customer[];
    paymentMethods: PaymentMethod[];
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
    paymentMethodId: string;
    setPaymentMethodId: (v: string) => void;
    categoryId: string;
    setCategoryId: (v: string) => void;
    multiSearch: string[];
    setMultiSearch: (v: string[]) => void;
    onSearch: () => void;
    onReset: () => void;
}) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-start select-none dir-rtl">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Right Drawer Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-l-2 border-slate-200 dark:border-slate-800 shadow-[10px_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-300 z-[10000]">

                {/* Drawer Header */}
                <div className="flex items-center justify-between p-6 sm:p-8 border-b-2 border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/60">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[22px] bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary shadow-md">
                            <SlidersHorizontal className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">تصفية فواتير العملاء</h3>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                تصفية الفواتير حسب العميل، التاريخ، البائع والمنتجات
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

                    {/* Product Search */}
                    <ModernMultiSelect
                        label="المنتجات"
                        placeholder="الكل"
                        options={products.map(p => ({ label: p.name, value: String(p.id), searchKey: p.name }))}
                        defaultValues={multiSearch}
                        onSelect={setMultiSearch}
                        allowFreeText={true}
                    />

                    {/* Select Dropdowns Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t-2 border-slate-200/60 dark:border-slate-800/60">
                        <ModernSelect
                            label="البائع"
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
                            label="وسيلة الدفع"
                            placeholder="الكل"
                            options={[{ label: 'الكل' }, ...paymentMethods.map(p => ({ label: p.name }))]}
                            defaultValue={paymentMethodId ? (paymentMethods.find(p => String(p.id) === paymentMethodId)?.name ?? '') : 'الكل'}
                            onSelect={val => setPaymentMethodId(val === 'الكل' ? '' : String(paymentMethods.find(p => p.name === val)?.id ?? ''))}
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

                {/* Drawer Footer Actions */}
                <div className="p-6 sm:p-8 border-t-2 border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => {
                            onSearch();
                            onClose();
                        }}
                        className="h-16 sm:h-18 px-8 rounded-[18px] bg-primary hover:bg-blue-600 active:bg-blue-700 text-white font-black text-xl flex-1 flex items-center justify-center gap-3 shadow-xl shadow-primary/30 border-2 border-primary/40 active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
                    >
                        <Search className="w-6 h-6 shrink-0" />
                        <span>عرض التقرير</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            onReset();
                            onClose();
                        }}
                        className="h-16 sm:h-18 px-6 rounded-[18px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-black text-lg flex items-center justify-center gap-2 border-2 border-slate-300 dark:border-slate-700 active:scale-95 transition-all cursor-pointer shrink-0 touch-manipulation shadow-md select-none"
                    >
                        <RotateCcw className="w-5 h-5 shrink-0 text-slate-700 dark:text-slate-300" />
                        <span>إعادة تعيين</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

/* =========================================================================
   MAIN SALES CUSTOMER INVOICES PAGE
   ========================================================================= */
export default function SalesCustomerInvoices({ users, customers, paymentMethods, categories, products, filters, data, includedProducts }: Props) {
    const [isFilterOpen,      setIsFilterOpen]      = useState(false);
    const [dateFrom,        setDateFrom]        = useState(filters.dateFrom ?? '');
    const [dateTo,          setDateTo]          = useState(filters.dateTo ?? '');
    const [userId,          setUserId]          = useState(filters.userId ? String(filters.userId) : '');
    const [customerId,      setCustomerId]      = useState(filters.customerId ? String(filters.customerId) : '');
    const [paymentMethodId, setPaymentMethodId] = useState(filters.paymentMethodId ? String(filters.paymentMethodId) : '');
    const [categoryId,      setCategoryId]      = useState(filters.categoryId ? String(filters.categoryId) : '');
    const [multiSearch, setMultiSearch] = useState<string[]>([
        ...(filters.productIds?.map(String) || []),
        ...(filters.searchName ? filters.searchName.split(',') : [])
    ]);
    const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());
    const [expandedInvoices,  setExpandedInvoices]  = useState<Set<number>>(new Set());

    // Dynamic Pagination State per Customer
    const [customerInvoicesMap, setCustomerInvoicesMap] = useState<Record<number, Invoice[]>>(() => {
        const map: Record<number, Invoice[]> = {};
        data.forEach(c => { map[c.customer_id] = c.invoices ?? []; });
        return map;
    });

    const [customerHasMoreMap, setCustomerHasMoreMap] = useState<Record<number, boolean>>(() => {
        const map: Record<number, boolean> = {};
        data.forEach(c => { map[c.customer_id] = (c.invoices?.length ?? 0) < c.invoice_count; });
        return map;
    });

    const [loadingCustomerMap, setLoadingCustomerMap] = useState<Record<number, boolean>>({});

    // Sync when data prop updates (e.g. after filter applied)
    useEffect(() => {
        const map: Record<number, Invoice[]> = {};
        const hasMoreMap: Record<number, boolean> = {};
        data.forEach(c => {
            map[c.customer_id] = c.invoices ?? [];
            hasMoreMap[c.customer_id] = (c.invoices?.length ?? 0) < c.invoice_count;
        });
        setCustomerInvoicesMap(map);
        setCustomerHasMoreMap(hasMoreMap);
    }, [data]);

    async function handleLoadMoreInvoices(customer: CustomerEntry) {
        const cid = customer.customer_id;
        if (loadingCustomerMap[cid]) return;

        const currentInvoices = customerInvoicesMap[cid] || customer.invoices || [];
        const offset = currentInvoices.length;

        setLoadingCustomerMap(prev => ({ ...prev, [cid]: true }));

        try {
            const params = new URLSearchParams();
            params.append('customer_id', String(cid));
            params.append('offset', String(offset));
            params.append('limit', '30');
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            if (userId) params.append('user_id', userId);
            if (paymentMethodId) params.append('payment_method_id', paymentMethodId);
            if (categoryId) params.append('category_id', categoryId);
            const prodIds = multiSearch.filter(s => !isNaN(Number(s)));
            const sName   = multiSearch.filter(s => isNaN(Number(s))).join(',');
            if (prodIds.length > 0) params.append('product_ids', prodIds.join(','));
            if (sName) params.append('search_name', sName);

            const res = await fetch(`/reports/sales/customer-invoices/load-more?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to load more');

            const json = await res.json();
            const newInvoices: Invoice[] = json.invoices || [];

            setCustomerInvoicesMap(prev => {
                const existing = prev[cid] || customer.invoices || [];
                return {
                    ...prev,
                    [cid]: [...existing, ...newInvoices],
                };
            });

            setCustomerHasMoreMap(prev => ({
                ...prev,
                [cid]: json.has_more ?? false,
            }));
        } catch (e) {
            console.error('Error loading more customer invoices:', e);
        } finally {
            setLoadingCustomerMap(prev => ({ ...prev, [cid]: false }));
        }
    }

    const activeFilterCount =
        (dateFrom ? 1 : 0) +
        (dateTo ? 1 : 0) +
        (userId ? 1 : 0) +
        (customerId ? 1 : 0) +
        (paymentMethodId ? 1 : 0) +
        (categoryId ? 1 : 0) +
        (multiSearch.length > 0 ? 1 : 0);

    function toggleCustomer(id: number) {
        setExpandedCustomers(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }
    function toggleInvoice(id: number) {
        setExpandedInvoices(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }

    function buildParams() {
        const p: Record<string, string> = {};
        if (dateFrom)        p.date_from          = dateFrom;
        if (dateTo)          p.date_to            = dateTo;
        if (userId)          p.user_id            = userId;
        if (customerId)      p.customer_id        = customerId;
        if (paymentMethodId) p.payment_method_id  = paymentMethodId;
        if (categoryId)      p.category_id        = categoryId;
        const prodIds = multiSearch.filter(s => !isNaN(Number(s)));
        const sName   = multiSearch.filter(s => isNaN(Number(s))).join(',');
        if (prodIds.length > 0) p.product_ids  = prodIds.join(',');
        if (sName)      p.search_name        = sName;
        return p;
    }

    function search() {
        router.get('/reports/sales/customer-invoices', buildParams(), { preserveScroll: true });
    }

    function reset() {
        setDateFrom(''); setDateTo(''); setUserId(''); setCustomerId('');
        setPaymentMethodId(''); setCategoryId(''); setMultiSearch([]);
        router.get('/reports/sales/customer-invoices', {}, { preserveScroll: true });
    }

    function buildExportUrl(format: 'excel' | 'pdf') {
        const params = new URLSearchParams(buildParams());
        return `/reports/sales/customer-invoices/${format}?${params.toString()}`;
    }

    const grandTotal = data.reduce((s, c) => s + c.total_amount, 0);
    const grandCount = data.reduce((s, c) => s + c.invoice_count, 0);

    const hasMatchedItems = data.some(c => c.invoices.some(inv => inv.items.some(item => item.is_matched)));
    const matchedTotal = data.reduce((sum, customer) =>
        sum + customer.invoices.reduce((invSum, inv) =>
            invSum + inv.items.reduce((itemSum, item) =>
                itemSum + (item.is_matched ? Number(item.line_total) : 0)
            , 0)
        , 0)
    , 0);

    return (
        <AppShell pageTitle="فواتير العملاء التفصيلية">
            <div className="flex flex-col gap-8 pb-32 lg:pb-8 dir-rtl">

                {/* Top Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-100/80 dark:bg-slate-800/40 p-6 sm:p-8 rounded-[30px] border-2 border-slate-200/80 dark:border-slate-700/60 shadow-lg">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[26px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black shrink-0 shadow-md">
                            <Users className="w-8 h-8 sm:w-10 sm:h-10" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Link href="/reports/sales" className="text-base font-bold text-primary hover:underline flex items-center gap-1">
                                    <ArrowRight className="w-4 h-4" /> تقرير المبيعات الرئيسي
                                </Link>
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                فواتير العملاء التفصيلية
                            </h1>
                            <p className="text-base sm:text-xl font-bold text-slate-500 dark:text-slate-400 mt-1">
                                استعراض وتفصيل الفواتير والمنتجات لكل عميل مع خيارات التصفية المتقدمة
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className="h-16 sm:h-18 px-8 sm:px-10 rounded-[22px] bg-slate-200 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-800 dark:text-slate-200 font-black text-base sm:text-xl flex items-center justify-center gap-3 active:scale-95 shadow-xl border-2 border-slate-300 dark:border-slate-700 touch-manipulation cursor-pointer transition-all relative"
                        >
                            <SlidersHorizontal className="w-6 h-6" />
                            <span>تصفية وفلترة</span>
                            {activeFilterCount > 0 && (
                                <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Filter Drawer Portal */}
                <FilterDrawer
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                    users={users}
                    customers={customers}
                    paymentMethods={paymentMethods}
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
                    paymentMethodId={paymentMethodId}
                    setPaymentMethodId={setPaymentMethodId}
                    categoryId={categoryId}
                    setCategoryId={setCategoryId}
                    multiSearch={multiSearch}
                    setMultiSearch={setMultiSearch}
                    onSearch={search}
                    onReset={reset}
                />

                {/* Included Products Tag Card */}
                {includedProducts && includedProducts.length > 0 && (
                    <SpatialCard
                        headerDot={false}
                        title={`المنتجات المشمولة في الحساب (${includedProducts.length})`}
                        icon={<Package className="w-6 h-6 text-primary" />}
                    >
                        <div className="flex flex-wrap gap-3 p-2">
                            {includedProducts.map(p => (
                                <span key={p.id} className="px-5 py-2.5 rounded-[16px] bg-primary/15 text-primary dark:text-primary-light text-base font-black border-2 border-primary/30 shadow-sm">
                                    {p.name}
                                </span>
                            ))}
                        </div>
                    </SpatialCard>
                )}

                {/* Summary Metric Cards */}
                <div className={`grid grid-cols-2 ${hasMatchedItems ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6`}>
                    {/* Customers Count */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">عدد العملاء</span>
                            <Users className="w-6 h-6 text-primary" />
                        </div>
                        <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{data.length}</span>
                    </SpatialCard>

                    {/* Invoices Count */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-blue-500/30 bg-blue-500/5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">إجمالي الفواتير</span>
                            <Receipt className="w-6 h-6 text-blue-500" />
                        </div>
                        <span className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400">{grandCount}</span>
                    </SpatialCard>

                    {/* Grand Total */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-emerald-500/30 bg-emerald-500/5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">الإجمالي الكلي</span>
                            <Wallet className="w-6 h-6 text-emerald-500" />
                        </div>
                        <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">{fmt(grandTotal)} <span className="text-base font-bold">د.ل</span></span>
                    </SpatialCard>

                    {/* Matched Total */}
                    {hasMatchedItems && (
                        <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-amber-500/30 bg-amber-500/5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Star className="w-4 h-4 fill-amber-500" /> نتائج البحث
                                </span>
                            </div>
                            <span className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400">{fmt(matchedTotal)} <span className="text-base font-bold">د.ل</span></span>
                        </SpatialCard>
                    )}
                </div>

                {/* Main Content Card */}
                <SpatialCard
                    headerDot={false}
                    title={`جدول ديون وفواتير العملاء (${data.length} عميل)`}
                    icon={<Users className="w-7 h-7 text-primary" />}
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
                            <PdfExportButton href={buildExportUrl('pdf')} excelHref={buildExportUrl('excel')} />
                            <Link
                                href="/reports/sales"
                                className="h-12 px-5 rounded-[16px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 font-black text-base flex items-center gap-2 transition-all active:scale-95 shadow-sm border-2 border-slate-300 dark:border-slate-700"
                            >
                                <TrendingUp className="w-5 h-5" />
                                <span className="hidden sm:inline">تقرير المبيعات</span>
                            </Link>
                        </div>
                    }
                >
                    {data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
                            <Users className="w-14 h-14 opacity-30" />
                            <p className="font-bold text-xl">لا توجد بيانات مطابقة لخيارات البحث</p>
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-slate-100 dark:divide-slate-800/60">
                            {data.map(customer => {
                                const isCustomerExpanded = expandedCustomers.has(customer.customer_id);
                                return (
                                    <div key={customer.customer_id}>
                                        {/* Customer Row Header */}
                                        <button
                                            type="button"
                                            onClick={() => toggleCustomer(customer.customer_id)}
                                            className="w-full flex items-center justify-between p-6 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors cursor-pointer text-right active:scale-99"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center transition-all ${
                                                    isCustomerExpanded ? 'bg-primary text-white' : 'bg-primary/10 text-primary border border-primary/20'
                                                }`}>
                                                    <ChevronRight className={`w-6 h-6 transition-transform duration-300 ${isCustomerExpanded ? 'rotate-90' : ''}`} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-2xl text-slate-900 dark:text-white">{customer.customer_name}</h3>
                                                    <span className="text-base font-bold text-slate-500 dark:text-slate-400 mt-0.5 inline-block">
                                                        {customer.invoice_count} فاتورة
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-left">
                                                <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">الإجمالي</span>
                                                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{fmt(customer.total_amount)} <span className="text-base font-bold text-slate-400">د.ل</span></span>
                                            </div>
                                        </button>

                                        {/* Expanded Customer Invoices */}
                                        {isCustomerExpanded && (
                                            <div className="p-4 sm:p-6 bg-slate-200/50 dark:bg-slate-900/60 border-y-2 border-slate-300 dark:border-slate-700">
                                                <div className="p-6 sm:p-8 bg-white/90 dark:bg-slate-800/90 rounded-[28px] border-2 border-primary/30 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
                                                    
                            <div className="overflow-x-auto rounded-[22px] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md">
                                                        <table className="w-full text-right border-collapse min-w-[750px]">
                                                            <thead>
                                                                <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-lg sm:text-xl font-black uppercase">
                                                                    <th className="p-5 rounded-r-[18px]">رقم الفاتورة</th>
                                                                    <th className="p-5">التاريخ</th>
                                                                    <th className="p-5">الإجمالي</th>
                                                                    <th className="p-5 rounded-l-[18px] text-center">التفاصيل</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/80 font-black text-xl sm:text-2xl">
                                                                {(customerInvoicesMap[customer.customer_id] || customer.invoices || []).map(inv => {
                                                                    const isInvoiceExpanded = expandedInvoices.has(inv.id);
                                                                    return (
                                                                        <>
                                                                            <tr key={inv.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                                                                <td className="p-5 font-black text-primary flex items-center gap-2">
                                                                                    <Receipt className="w-5 h-5 text-primary/70 shrink-0" />
                                                                                    <span>INV#{inv.id}</span>
                                                                                </td>
                                                                                <td className="p-5 text-slate-600 dark:text-slate-300 font-bold whitespace-nowrap">{inv.date ? inv.date.substring(0, 10) : '—'}</td>
                                                                                <td className="p-5 font-black text-slate-900 dark:text-white whitespace-nowrap">{fmt(inv.total)} د.ل</td>
                                                                                <td className="p-5 text-center whitespace-nowrap">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => toggleInvoice(inv.id)}
                                                                                        className={`px-5 py-2.5 rounded-[16px] border-2 font-black text-base inline-flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer ${
                                                                                            isInvoiceExpanded
                                                                                                ? 'bg-primary text-white border-primary'
                                                                                                : 'bg-primary/10 dark:bg-primary/20 text-primary border-primary/30 hover:bg-primary hover:text-white'
                                                                                        }`}
                                                                                    >
                                                                                        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isInvoiceExpanded ? 'rotate-90' : ''}`} />
                                                                                        <span>{isInvoiceExpanded ? 'إخفاء الاصناف' : 'عرض الأصناف'}</span>
                                                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                                                                            isInvoiceExpanded ? 'bg-white text-primary' : 'bg-primary text-white'
                                                                                        }`}>
                                                                                            {inv.items?.length || 0}
                                                                                        </span>
                                                                                    </button>
                                                                                </td>
                                                                            </tr>

                                                                            {/* Invoice Items Nested Row */}
                                                                            {isInvoiceExpanded && (
                                                                                <tr key={`${inv.id}-items`}>
                                                                                    <td colSpan={4} className="p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-800/70 border-y-2 border-slate-300 dark:border-slate-700">
                                                                                        <div className="flex flex-col gap-3">
                                                                                            <div className="flex items-center justify-between px-2 mb-1">
                                                                                                <h5 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                                                                                    <FileText className="w-5 h-5 text-primary" />
                                                                                                    <span>الأصناف والكميات بالفاتورة #{inv.id}</span>
                                                                                                </h5>
                                                                                            </div>

                                                                                            <div className="grid grid-cols-1 gap-3">
                                                                                                {inv.items.map((item, i) => (
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
                                                                                                                item.count > 1
                                                                                                                    ? 'bg-blue-500/15 border-2 border-blue-500/30 text-blue-600 dark:text-blue-400'
                                                                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                                                                            }`}>
                                                                                                                {item.count}×
                                                                                                            </span>
                                                                                                            <div className="flex flex-col min-w-0">
                                                                                                                <span className="font-black text-slate-900 dark:text-white text-xl truncate flex items-center gap-2">
                                                                                                                    {item.is_matched && <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />}
                                                                                                                    {item.product_name}
                                                                                                                </span>
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

                                                                                                            <div className="text-left">
                                                                                                                <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase block mb-0.5">إجمالي الصنف</span>
                                                                                                                <span className="text-2xl font-black text-slate-900 dark:text-white">{fmt(item.line_total)} <span className="text-sm font-bold text-slate-400">د.ل</span></span>
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

                                                    {/* Load More Button per Customer */}
                                                    {(customerHasMoreMap[customer.customer_id] || (customerInvoicesMap[customer.customer_id]?.length ?? 0) < customer.invoice_count) && (
                                                        <div className="flex items-center justify-center pt-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleLoadMoreInvoices(customer)}
                                                                disabled={loadingCustomerMap[customer.customer_id]}
                                                                className="px-8 py-4 rounded-[22px] bg-primary hover:bg-blue-600 text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all cursor-pointer disabled:opacity-60 border-2 border-primary/40 touch-manipulation"
                                                            >
                                                                {loadingCustomerMap[customer.customer_id] ? (
                                                                    <>
                                                                        <RotateCcw className="w-6 h-6 animate-spin" />
                                                                        <span>جاري تحميل 30 فاتورة إضافية...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Download className="w-6 h-6" />
                                                                        <span>رؤية المزيد من الفواتير (عرض {customerInvoicesMap[customer.customer_id]?.length || 0} من أصل {customer.invoice_count})</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    )}
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
        </AppShell>
    );
}
