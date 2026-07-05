import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect, ModernMultiSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { Users, SlidersHorizontal, ChevronDown, ChevronRight, Search, FileSpreadsheet, FileText, ArrowRight, Package, Star } from 'lucide-react';

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

function fmt(n: number): string {
    return n % 1 === 0
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SalesCustomerInvoices({ users, customers, paymentMethods, categories, products, filters, data, includedProducts }: Props) {
    const [filterOpen,      setFilterOpen]      = useState(false);
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

    function toggleCustomer(id: number) {
        setExpandedCustomers(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }
    function toggleInvoice(id: number) {
        setExpandedInvoices(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }

    const hasFilter = dateFrom || dateTo || userId || customerId || paymentMethodId || categoryId || multiSearch.length > 0;

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

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
            <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={dateTo}   onChange={setDateTo} />
            <ModernMultiSelect
                label="المنتجات"
                placeholder="الكل"
                options={products.map(p => ({ label: p.name, value: String(p.id), searchKey: p.name }))}
                defaultValues={multiSearch}
                onSelect={setMultiSearch}
                allowFreeText={true}
            />
            <ModernSelect label="البائع" placeholder="الكل"
                options={[{ label: 'الكل' }, ...users.map(u => ({ label: u.name }))]}
                defaultValue={userId ? (users.find(u => String(u.id) === userId)?.name ?? '') : 'الكل'}
                onSelect={val => setUserId(val === 'الكل' ? '' : String(users.find(u => u.name === val)?.id ?? ''))}
            />
            <ModernSelect label="العميل" placeholder="الكل"
                options={[{ label: 'الكل' }, ...customers.map(c => ({ label: c.name }))]}
                defaultValue={customerId ? (customers.find(c => String(c.id) === customerId)?.name ?? '') : 'الكل'}
                onSelect={val => setCustomerId(val === 'الكل' ? '' : String(customers.find(c => c.name === val)?.id ?? ''))}
            />
            <ModernSelect label="وسيلة الدفع" placeholder="الكل"
                options={[{ label: 'الكل' }, ...paymentMethods.map(p => ({ label: p.name }))]}
                defaultValue={paymentMethodId ? (paymentMethods.find(p => String(p.id) === paymentMethodId)?.name ?? '') : 'الكل'}
                onSelect={val => setPaymentMethodId(val === 'الكل' ? '' : String(paymentMethods.find(p => p.name === val)?.id ?? ''))}
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
        <AppShell pageTitle="فواتير العملاء التفصيلية">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">

                <div className="flex items-center gap-3">
                    <a href="/reports/sales" className="flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-primary transition-colors">
                        <ArrowRight className="w-4 h-4" /> تقرير المبيعات
                    </a>
                    <span className="text-slate-300 dark:text-white/20">/</span>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">فواتير العملاء التفصيلية</h1>
                </div>

                {/* Mobile Filter */}
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

                        {includedProducts && includedProducts.length > 0 && (
                            <SpatialCard title={`المنتجات المشمولة في الحساب (${includedProducts.length})`} icon={<Package className="w-4 h-4" />}>
                                <div className="flex flex-wrap gap-2">
                                    {includedProducts.map(p => (
                                        <span key={p.id} className="px-3 py-1.5 rounded-[10px] bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light text-[13px] font-bold">
                                            {p.name}
                                        </span>
                                    ))}
                                </div>
                            </SpatialCard>
                        )}

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="spatial-card p-4 flex flex-col gap-1">
                                <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">عدد العملاء</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{data.length}</p>
                            </div>
                            <div className="spatial-card p-4 flex flex-col gap-1">
                                <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">عدد الفواتير</p>
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

                        {/* Customers Table */}
                        <SpatialCard title={`العملاء (${data.length})`} icon={<Users className="w-4 h-4" />}>
                            {data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                    <Users className="w-12 h-12 opacity-30" />
                                    <p className="font-bold">لا توجد بيانات</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-black/5 dark:divide-white/5">
                                    {data.map(customer => (
                                        <div key={customer.customer_id}>
                                            {/* Customer Row */}
                                            <button
                                                onClick={() => toggleCustomer(customer.customer_id)}
                                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors text-right"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <ChevronRight className={`w-4 h-4 text-primary transition-transform shrink-0 ${expandedCustomers.has(customer.customer_id) ? 'rotate-90' : ''}`} />
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white">{customer.customer_name}</p>
                                                        <p className="text-xs font-bold text-slate-400 dark:text-white/40">{customer.invoice_count} فاتورة</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-slate-400 dark:text-white/40">الإجمالي</p>
                                                    <p className="font-black text-slate-800 dark:text-white">{fmt(customer.total_amount)}</p>
                                                </div>
                                            </button>

                                            {/* Customer Invoices */}
                                            {expandedCustomers.has(customer.customer_id) && (
                                                <div className="bg-black/2 dark:bg-white/2 px-4 pb-3">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-[16px]">
                                                            <thead>
                                                                <tr className="border-b border-black/5 dark:border-white/5">
                                                                    <th className="text-right py-2 px-3 text-sm font-black text-slate-400 dark:text-white/30">رقم الفاتورة</th>
                                                                    <th className="text-right py-2 px-3 text-sm font-black text-slate-400 dark:text-white/30">التاريخ</th>
                                                                    <th className="text-right py-2 px-3 text-sm font-black text-slate-400 dark:text-white/30">الإجمالي</th>
                                                                    <th className="py-2 px-3"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                                {customer.invoices.map(inv => (
                                                                    <>
                                                                        <tr key={inv.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                                            <td className="py-2 px-3 font-black text-primary">INV#{inv.id}</td>
                                                                            <td className="py-2 px-3 font-bold text-slate-500 dark:text-white/50">{inv.date.substring(0, 10)}</td>
                                                                            <td className="py-2 px-3 font-black text-slate-800 dark:text-white">{fmt(inv.total)}</td>
                                                                            <td className="py-2 px-3">
                                                                                <button onClick={() => toggleInvoice(inv.id)}
                                                                                    className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/70 transition-colors whitespace-nowrap">
                                                                                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedInvoices.has(inv.id) ? 'rotate-90' : ''}`} />
                                                                                    تفاصيل
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                        {expandedInvoices.has(inv.id) && (
                                                                            <tr key={`${inv.id}-items`}>
                                                                                <td colSpan={4} className="px-4 pt-1 pb-3 bg-black/2 dark:bg-white/2">
                                                                                    {/* header */}
                                                                                    <div className="hidden sm:grid grid-cols-[50px_2fr_70px_80px_90px] gap-2 px-3 py-2 text-xs font-bold text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-slate-800/50 rounded-[10px] border border-slate-200/50 dark:border-slate-700/50 mb-1.5">
                                                                                        <span className="text-center">عدد</span>
                                                                                        <span>المنتج</span>
                                                                                        <span className="text-center">الحجم</span>
                                                                                        <span className="text-center">سعر</span>
                                                                                        <span className="text-center">الإجمالي</span>
                                                                                    </div>
                                                                                    <div className="flex flex-col gap-1.5">
                                                                                        {inv.items.map((item, i) => (
                                                                                            <div key={i}>
                                                                                                {/* Desktop grid row */}
                                                                                                <div className={`hidden sm:grid grid-cols-[50px_2fr_70px_80px_90px] gap-2 px-3 py-2.5 rounded-[12px] border transition-all shadow-sm ${item.is_matched ? 'bg-amber-50/50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary/30'}`}>
                                                                                                    <div className="flex items-center justify-center">
                                                                                                        <span className={`w-9 h-8 rounded-[8px] flex items-center justify-center font-black text-sm ${
                                                                                                            item.count > 1
                                                                                                                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400'
                                                                                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-white/50'
                                                                                                        }`}>{item.count}</span>
                                                                                                    </div>
                                                                                                    <div className="flex flex-col justify-center min-w-0">
                                                                                                        <span className="font-bold text-slate-800 dark:text-white text-sm truncate flex items-center gap-1.5">
                                                                                                            {item.is_matched && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                                                                                                            {item.product_name}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <div className="flex items-center justify-center">
                                                                                                        <span className="text-xs font-black text-white bg-primary px-2 py-1 rounded-full">{fmt(item.quantity)}</span>
                                                                                                    </div>
                                                                                                    <div className="flex items-center justify-center">
                                                                                                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{fmt(item.unit_price)}</span>
                                                                                                    </div>
                                                                                                    <div className="flex items-center justify-center">
                                                                                                        <span className="font-black text-slate-800 dark:text-white text-sm">{fmt(item.line_total)}</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                                {/* Mobile card row */}
                                                                                                <div className={`sm:hidden flex items-center gap-2 p-2.5 rounded-[12px] border shadow-sm ${item.is_matched ? 'bg-amber-50/50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                                                                                    <span className={`w-9 h-9 rounded-[8px] flex items-center justify-center font-black text-sm shrink-0 ${
                                                                                                        item.count > 1
                                                                                                            ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400'
                                                                                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-white/50'
                                                                                                    }`}>{item.count}</span>
                                                                                                    <div className="flex-1 min-w-0">
                                                                                                        <p className="font-bold text-slate-800 dark:text-white text-xs truncate flex items-center gap-1.5">
                                                                                                            {item.is_matched && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                                                                                                            {item.product_name}
                                                                                                        </p>
                                                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                                                            <span className="text-[10px] font-black text-white bg-primary px-1.5 py-0.5 rounded-full">{fmt(item.quantity)}</span>
                                                                                                            <span className="text-[10px] font-bold text-slate-400 dark:text-white/30">× {fmt(item.unit_price)}</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <span className="font-black text-slate-800 dark:text-white text-sm shrink-0">{fmt(item.line_total)}</span>
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
                                                                    <td className="py-2 px-3 font-black text-slate-800 dark:text-white">{fmt(customer.total_amount)}</td>
                                                                    <td></td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Grand Total */}
                                    <div className="flex items-center justify-between px-4 py-3 bg-black/3 dark:bg-white/3">
                                        <p className="font-black text-slate-500 dark:text-white/40 text-xs uppercase">الإجمالي الكلي</p>
                                        <p className="font-black text-slate-800 dark:text-white">{fmt(grandTotal)}</p>
                                    </div>
                                </div>
                            )}
                        </SpatialCard>
                    </div>

                    {/* Desktop Filter */}
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
