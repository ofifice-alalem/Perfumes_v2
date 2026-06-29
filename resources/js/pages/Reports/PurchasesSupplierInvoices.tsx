import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { Truck, SlidersHorizontal, ChevronDown, ChevronRight, Search, FileSpreadsheet, FileText, ArrowRight } from 'lucide-react';

interface User     { id: number; name: string; }
interface Supplier { id: number; name: string; }
interface Category { id: number; name: string; }

interface PurchaseItem { product_name: string; quantity: number; unit_cost: number; count: number; }
interface Purchase     { id: number; total: number; date: string; items: PurchaseItem[]; }
interface SupplierEntry {
    supplier_id: number; supplier_name: string;
    purchase_count: number; total_amount: number;
    purchases: Purchase[];
}

interface Props {
    users: User[]; suppliers: Supplier[]; categories: Category[];
    filters: { dateFrom: string | null; dateTo: string | null; userId: number | null; supplierId: number | null; categoryId: number | null; };
    data: SupplierEntry[];
}

function fmt(n: number): string {
    return n % 1 === 0
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PurchasesSupplierInvoices({ users, suppliers, categories, filters, data }: Props) {
    const [filterOpen,         setFilterOpen]         = useState(false);
    const [dateFrom,           setDateFrom]           = useState(filters.dateFrom ?? '');
    const [dateTo,             setDateTo]             = useState(filters.dateTo ?? '');
    const [userId,             setUserId]             = useState(filters.userId ? String(filters.userId) : '');
    const [supplierId,         setSupplierId]         = useState(filters.supplierId ? String(filters.supplierId) : '');
    const [categoryId,         setCategoryId]         = useState(filters.categoryId ? String(filters.categoryId) : '');
    const [expandedSuppliers,  setExpandedSuppliers]  = useState<Set<number>>(new Set());
    const [expandedPurchases,  setExpandedPurchases]  = useState<Set<number>>(new Set());

    function toggleSupplier(id: number) {
        setExpandedSuppliers(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }
    function togglePurchase(id: number) {
        setExpandedPurchases(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }

    const hasFilter = dateFrom || dateTo || userId || supplierId || categoryId;

    function buildParams() {
        const p: Record<string, string> = {};
        if (dateFrom)   p.date_from   = dateFrom;
        if (dateTo)     p.date_to     = dateTo;
        if (userId)     p.user_id     = userId;
        if (supplierId) p.supplier_id = supplierId;
        if (categoryId) p.category_id = categoryId;
        return p;
    }

    function search() {
        router.get('/reports/purchases/supplier-invoices', buildParams(), { preserveScroll: true });
    }
    function reset() {
        setDateFrom(''); setDateTo(''); setUserId(''); setSupplierId(''); setCategoryId('');
        router.get('/reports/purchases/supplier-invoices', {}, { preserveScroll: true });
    }
    function buildExportUrl(format: 'excel' | 'pdf') {
        return `/reports/purchases/supplier-invoices/${format}?${new URLSearchParams(buildParams()).toString()}`;
    }

    const grandTotal = data.reduce((s, e) => s + e.total_amount, 0);
    const grandCount = data.reduce((s, e) => s + e.purchase_count, 0);

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
            <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={dateTo}   onChange={setDateTo} />
            <ModernSelect label="المستخدم" placeholder="الكل"
                options={[{ label: 'الكل' }, ...users.map(u => ({ label: u.name }))]}
                defaultValue={userId ? (users.find(u => String(u.id) === userId)?.name ?? '') : 'الكل'}
                onSelect={val => setUserId(val === 'الكل' ? '' : String(users.find(u => u.name === val)?.id ?? ''))}
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
        <AppShell pageTitle="فواتير الموردين التفصيلية">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">

                <div className="flex items-center gap-3">
                    <a href="/reports/purchases" className="flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-primary transition-colors">
                        <ArrowRight className="w-4 h-4" /> تقرير المشتريات
                    </a>
                    <span className="text-slate-300 dark:text-white/20">/</span>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">فواتير الموردين التفصيلية</h1>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="spatial-card p-4 flex flex-col gap-1">
                                <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">عدد الموردين</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{data.length}</p>
                            </div>
                            <div className="spatial-card p-4 flex flex-col gap-1">
                                <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">عدد الفواتير</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{grandCount}</p>
                            </div>
                        </div>

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

                        <SpatialCard title={`الموردين (${data.length})`} icon={<Truck className="w-4 h-4" />}>
                            {data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                    <Truck className="w-12 h-12 opacity-30" />
                                    <p className="font-bold">لا توجد بيانات</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-black/5 dark:divide-white/5">
                                    {data.map(supplier => (
                                        <div key={supplier.supplier_id}>
                                            <button onClick={() => toggleSupplier(supplier.supplier_id)}
                                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors text-right">
                                                <div className="flex items-center gap-3">
                                                    <ChevronRight className={`w-4 h-4 text-primary transition-transform shrink-0 ${expandedSuppliers.has(supplier.supplier_id) ? 'rotate-90' : ''}`} />
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white">{supplier.supplier_name}</p>
                                                        <p className="text-xs font-bold text-slate-400 dark:text-white/40">{supplier.purchase_count} فاتورة</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-slate-400 dark:text-white/40">الإجمالي</p>
                                                    <p className="font-black text-slate-800 dark:text-white">{fmt(supplier.total_amount)}</p>
                                                </div>
                                            </button>

                                            {expandedSuppliers.has(supplier.supplier_id) && (
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
                                                                {supplier.purchases.map(p => (
                                                                    <>
                                                                        <tr key={p.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                                            <td className="py-2 px-3 font-black text-primary">PO#{p.id}</td>
                                                                            <td className="py-2 px-3 font-bold text-slate-500 dark:text-white/50">{p.date.substring(0, 10)}</td>
                                                                            <td className="py-2 px-3 font-black text-slate-800 dark:text-white">{fmt(p.total)}</td>
                                                                            <td className="py-2 px-3">
                                                                                <button onClick={() => togglePurchase(p.id)}
                                                                                    className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/70 transition-colors whitespace-nowrap">
                                                                                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedPurchases.has(p.id) ? 'rotate-90' : ''}`} />
                                                                                    تفاصيل
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                        {expandedPurchases.has(p.id) && (
                                                                            <tr key={`${p.id}-items`}>
                                                                                <td colSpan={4} className="px-4 pt-1 pb-3 bg-black/2 dark:bg-white/2">
                                                                                    <div className="hidden sm:grid grid-cols-[50px_2fr_70px_80px_90px] gap-2 px-3 py-2 text-xs font-bold text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-slate-800/50 rounded-[10px] border border-slate-200/50 dark:border-slate-700/50 mb-1.5">
                                                                                        <span className="text-center">عدد</span>
                                                                                        <span>المنتج</span>
                                                                                        <span className="text-center">الحجم</span>
                                                                                        <span className="text-center">التكلفة</span>
                                                                                        <span className="text-center">الإجمالي</span>
                                                                                    </div>
                                                                                    <div className="flex flex-col gap-1.5">
                                                                                        {p.items.map((item, i) => (
                                                                                            <div key={i}>
                                                                                                <div className="hidden sm:grid grid-cols-[50px_2fr_70px_80px_90px] gap-2 px-3 py-2.5 rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all shadow-sm">
                                                                                                    <div className="flex items-center justify-center">
                                                                                                        <span className={`w-9 h-8 rounded-[8px] flex items-center justify-center font-black text-sm ${item.count > 1 ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-white/50'}`}>{item.count}</span>
                                                                                                    </div>
                                                                                                    <div className="flex flex-col justify-center min-w-0">
                                                                                                        <span className="font-bold text-slate-800 dark:text-white text-sm truncate">{item.product_name}</span>
                                                                                                    </div>
                                                                                                    <div className="flex items-center justify-center">
                                                                                                        <span className="text-xs font-black text-white bg-primary px-2 py-1 rounded-full">{fmt(item.quantity)}</span>
                                                                                                    </div>
                                                                                                    <div className="flex items-center justify-center">
                                                                                                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{fmt(item.unit_cost)}</span>
                                                                                                    </div>
                                                                                                    <div className="flex items-center justify-center">
                                                                                                        <span className="font-black text-slate-800 dark:text-white text-sm">{fmt(item.quantity * item.count * item.unit_cost)}</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="sm:hidden flex items-center gap-2 p-2.5 rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                                                    <span className={`w-9 h-9 rounded-[8px] flex items-center justify-center font-black text-sm shrink-0 ${item.count > 1 ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-white/50'}`}>{item.count}</span>
                                                                                                    <div className="flex-1 min-w-0">
                                                                                                        <p className="font-bold text-slate-800 dark:text-white text-xs truncate">{item.product_name}</p>
                                                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                                                            <span className="text-[10px] font-black text-white bg-primary px-1.5 py-0.5 rounded-full">{fmt(item.quantity)}</span>
                                                                                                            <span className="text-[10px] font-bold text-slate-400 dark:text-white/30">× {fmt(item.unit_cost)}</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <span className="font-black text-slate-800 dark:text-white text-sm shrink-0">{fmt(item.quantity * item.count * item.unit_cost)}</span>
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
                                                                    <td className="py-2 px-3 font-black text-slate-800 dark:text-white">{fmt(supplier.total_amount)}</td>
                                                                    <td></td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

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
