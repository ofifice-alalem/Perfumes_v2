import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { AmountRangeInput } from '@/components/ui/AmountRangeInput';
import { Plus, Eye, Trash2, RotateCcw, SlidersHorizontal, ChevronDown, Search } from 'lucide-react';

interface Customer { id: number; name: string; }
interface Product  { id: number; name: string; }
interface PaymentMethod { id: number; name: string; }
interface InvoiceReturn {
    id: number;
    customer: Customer | null;
    invoice: { id: number } | null;
    total: string;
    recovered_amount: string;
    due_recovery: string;
    recovery_status: 'unpaid' | 'partial' | 'paid';
    created_at: string;
    deleted_at: string | null;
}
interface Paginated<T> {
    data: T[]; current_page: number; last_page: number; total: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    returns:        Paginated<InvoiceReturn>;
    customers:      Customer[];
    products:       Product[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

const recoveryLabel = { unpaid: 'لم يُسترد', partial: 'مسترد جزئياً', paid: 'مسترد بالكامل' };
const recoveryClass  = {
    unpaid:  'bg-red-500/10 text-red-500',
    partial: 'bg-amber-500/10 text-amber-500',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function fmt(v: string | number) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(v: string | null) {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

export default function InvoiceReturnsIndex({ returns: data, customers, products, paymentMethods, flash }: Props) {
    const [filterOpen, setFilterOpen] = useState(false);
    const [activeTab,  setActiveTab]  = useState<'active' | 'deleted'>('active');

    const activeReturns  = data.data.filter(r => !r.deleted_at);
    const deletedReturns = data.data.filter(r => r.deleted_at);
    const displayReturns = activeTab === 'active' ? activeReturns : deletedReturns;
    const params = new URLSearchParams(window.location.search);
    const [fCustomer,   setFCustomer]   = useState(params.get('filter[customer_id]') ?? '');
    const [fStatus,     setFStatus]     = useState(params.get('filter[recovery_status]') ?? '');
    const [fProduct,    setFProduct]    = useState(params.get('filter[product_id]') ?? '');
    const [fDateFrom,   setFDateFrom]   = useState(params.get('filter[date_from]') ?? '');
    const [fDateTo,     setFDateTo]     = useState(params.get('filter[date_to]') ?? '');
    const [fAmountFrom, setFAmountFrom] = useState(params.get('filter[amount_from]') ?? '');
    const [fAmountTo,   setFAmountTo]   = useState(params.get('filter[amount_to]') ?? '');

    const hasFilter = fCustomer || fStatus || fProduct || fDateFrom || fDateTo || fAmountFrom || fAmountTo;

    function applyFilter() {
        const f: Record<string, string> = {};
        if (fCustomer)   f['filter[customer_id]']       = fCustomer;
        if (fStatus)     f['filter[recovery_status]']   = fStatus;
        if (fProduct)    f['filter[product_id]']        = fProduct;
        if (fDateFrom)   f['filter[date_from]']         = fDateFrom;
        if (fDateTo)     f['filter[date_to]']           = fDateTo;
        if (fAmountFrom) f['filter[amount_from]']       = fAmountFrom;
        if (fAmountTo)   f['filter[amount_to]']         = fAmountTo;
        router.get('/invoice-returns', f, { preserveScroll: true });
    }

    function resetFilter() {
        setFCustomer(''); setFStatus(''); setFProduct('');
        setFDateFrom(''); setFDateTo(''); setFAmountFrom(''); setFAmountTo('');
        router.get('/invoice-returns', {}, { preserveScroll: true });
    }

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
            <ModernSelect label="العميل" placeholder="الكل"
                options={[{ label: 'الكل' }, ...customers.map(c => ({ label: c.name }))]}
                defaultValue={fCustomer ? (customers.find(c => String(c.id) === fCustomer)?.name ?? '') : 'الكل'}
                onSelect={val => setFCustomer(val === 'الكل' ? '' : String(customers.find(c => c.name === val)?.id ?? ''))}
            />
            <ModernSelect label="المنتج" placeholder="الكل"
                options={[{ label: 'الكل' }, ...products.map(p => ({ label: p.name }))]}
                defaultValue={fProduct ? (products.find(p => String(p.id) === fProduct)?.name ?? '') : 'الكل'}
                onSelect={val => setFProduct(val === 'الكل' ? '' : String(products.find(p => p.name === val)?.id ?? ''))}
            />
            <ModernSelect label="حالة الاسترداد" placeholder="الكل"
                options={[{ label: 'الكل' }, { label: 'لم يُسترد' }, { label: 'مسترد جزئياً' }, { label: 'مسترد بالكامل' }]}
                defaultValue={fStatus === 'unpaid' ? 'لم يُسترد' : fStatus === 'partial' ? 'مسترد جزئياً' : fStatus === 'paid' ? 'مسترد بالكامل' : 'الكل'}
                onSelect={val => setFStatus(val === 'لم يُسترد' ? 'unpaid' : val === 'مسترد جزئياً' ? 'partial' : val === 'مسترد بالكامل' ? 'paid' : '')}
            />
            <AmountRangeInput label="الإجمالي (من — إلى)" valueFrom={fAmountFrom} valueTo={fAmountTo}
                onChange={(from, to) => { setFAmountFrom(from); setFAmountTo(to); }} />
            <DateFilterInput label="من تاريخ" value={fDateFrom} onChange={setFDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={fDateTo}   onChange={setFDateTo} />
            <button onClick={applyFilter} className="w-full h-11 rounded-[14px] bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                <Search className="w-4 h-4" /> تطبيق الفلتر
            </button>
            {hasFilter && (
                <button onClick={resetFilter} className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                    إعادة تعيين
                </button>
            )}
        </div>
    );

    return (
        <AppShell pageTitle="مرتجعات العملاء">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">مرتجعات العملاء</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">إدارة مرتجعات البيع</p>
                    </div>
                    <Link href="/invoice-returns/create" className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
                        <Plus className="w-4 h-4" /> مرتجع جديد
                    </Link>
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
                {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

                <div className="lg:hidden">
                    <button onClick={() => setFilterOpen(p => !p)} className="w-full flex items-center justify-between px-5 h-12 rounded-[18px] spatial-input font-bold text-[14px] text-slate-700 dark:text-white/70">
                        <div className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> فلترة {hasFilter && <span className="w-2 h-2 rounded-full bg-primary" />}</div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {filterOpen && <div className="mt-3 spatial-card p-5 animate-in fade-in slide-in-from-top-2 duration-200"><FilterPanel /></div>}
                </div>

                <div className="flex gap-6">
                    <div className="flex-1 min-w-0">
                        {/* Tabs */}
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setActiveTab('active')} className={`px-5 h-11 rounded-[14px] font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                المرتجعات النشطة ({activeReturns.length})
                            </button>
                            <button onClick={() => setActiveTab('deleted')} className={`px-5 h-11 rounded-[14px] font-bold text-sm transition-all ${activeTab === 'deleted' ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                المرتجعات الملغية ({deletedReturns.length})
                            </button>
                        </div>

                        <SpatialCard title={`المرتجعات (${displayReturns.length})`} icon={<RotateCcw className="w-4 h-4" />}>
                            {displayReturns.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                                    <span className="text-4xl">↩️</span>
                                    <span className="font-bold">{activeTab === 'active' ? 'لا توجد مرتجعات' : 'لا توجد مرتجعات ملغية'}</span>
                                </div>
                            ) : (
                                <>
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-[16px]">
                                            <thead>
                                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                    {['#', 'العميل', 'الفاتورة', 'المرتجع', 'التسوية', 'المتبقي', 'الحالة', 'التاريخ', 'الإجراءات'].map(h => (
                                                        <th key={h} className="text-right px-4 py-4 text-sm font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {displayReturns.map(ret => (
                                                    <tr key={ret.id} className={`hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors ${ret.deleted_at ? 'opacity-50' : ''}`}>
                                                        <td className="px-4 py-4 font-bold text-slate-400 dark:text-white/40">#{ret.id}</td>
                                                        <td className="px-4 py-4 font-bold text-slate-800 dark:text-white">{ret.customer?.name ?? 'زبون نقدي'}</td>
                                                        <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/60">
                                                            {ret.invoice ? <Link href={`/invoices/${ret.invoice.id}`} className="hover:text-primary transition-colors">#{ret.invoice.id}</Link> : '—'}
                                                        </td>
                                                        <td className="px-4 py-4 font-black text-orange-500 whitespace-nowrap">{fmt(ret.total)}</td>
                                                        <td className="px-4 py-4 font-black text-purple-500 whitespace-nowrap">{fmt(ret.recovered_amount)}</td>
                                                        <td className="px-4 py-4 font-black text-amber-500 whitespace-nowrap">{fmt(ret.due_recovery)}</td>
                                                        <td className="px-4 py-4">
                                                            {ret.deleted_at ? (
                                                                <span className="text-xs font-bold px-2.5 py-1 rounded-[8px] bg-red-500/10 text-red-500">ملغي</span>
                                                            ) : (
                                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-[8px] ${recoveryClass[ret.recovery_status]}`}>{recoveryLabel[ret.recovery_status]}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-slate-500 dark:text-white/50 whitespace-nowrap font-bold text-xs"><span className="px-2.5 py-1 rounded-[8px] bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5 text-[16px]">{fmtDate(ret.created_at)}</span></td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <Link href={`/invoice-returns/${ret.id}`} className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-xs">
                                                                    <Eye className="w-3 h-3" /> عرض
                                                                </Link>
                                                                {ret.deleted_at ? (
                                                                    <button onClick={() => router.post(`/invoice-returns/${ret.id}/restore`)} className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-xs">
                                                                        <RotateCcw className="w-3 h-3" /> استعادة
                                                                    </button>
                                                                ) : (
                                                                    <button onClick={() => router.delete(`/invoice-returns/${ret.id}`)} className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs">
                                                                        <Trash2 className="w-3 h-3" /> إلغاء
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
                                        {displayReturns.map(ret => (
                                            <div key={ret.id} className={`rounded-[24px] border border-black/8 dark:border-white/12 overflow-hidden ${ret.deleted_at ? 'opacity-60' : ''}`}>
                                                <div className="px-5 py-4 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                                    <div>
                                                        <span className="font-black text-slate-800 dark:text-white">{ret.customer?.name ?? 'زبون نقدي'}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">#{ret.id}</span>
                                                            {ret.deleted_at ? (
                                                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">ملغي</span>
                                                            ) : (
                                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${recoveryClass[ret.recovery_status]}`}>{recoveryLabel[ret.recovery_status]}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-5">
                                                    <div className="flex items-center justify-between py-3">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">الفاتورة</span>
                                                        {ret.invoice ? (
                                                            <Link href={`/invoices/${ret.invoice.id}`} className="font-bold text-primary hover:underline">#{ret.invoice.id}</Link>
                                                        ) : (
                                                            <span className="font-bold text-slate-400 dark:text-white/40">—</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between py-3">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">المرتجع</span>
                                                        <span className="font-black text-orange-500">{fmt(ret.total)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-3">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">التسوية</span>
                                                        <span className="font-black text-purple-500">{fmt(ret.recovered_amount)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-3">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">المتبقي</span>
                                                        <span className="font-black text-amber-500">{fmt(ret.due_recovery)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-3">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">التاريخ</span>
                                                        <span className="text-[16px] font-black text-slate-800 dark:text-white/90 tracking-widest">{fmtDate(ret.created_at)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 px-5 py-4 border-t border-black/5 dark:border-white/8">
                                                    <Link href={`/invoice-returns/${ret.id}`} className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm">
                                                        <Eye className="w-4 h-4" /> عرض
                                                    </Link>
                                                    {ret.deleted_at ? (
                                                        <button onClick={() => router.post(`/invoice-returns/${ret.id}/restore`)} className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm">
                                                            <RotateCcw className="w-4 h-4" /> استعادة
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => router.delete(`/invoice-returns/${ret.id}`)} className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                                            <Trash2 className="w-4 h-4" /> إلغاء
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {data.last_page > 1 && (
                                        <div className="flex items-center justify-center gap-2 pt-4 flex-wrap">
                                            {data.links.map((link, i) => (
                                                link.url ? (
                                                    <Link key={i} href={link.url}
                                                        className={`px-4 h-9 rounded-[12px] font-bold text-sm flex items-center transition-all ${link.active ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }} />
                                                ) : (
                                                    <span key={i} className="px-4 h-9 rounded-[12px] font-bold text-sm flex items-center text-slate-300 dark:text-white/20"
                                                        dangerouslySetInnerHTML={{ __html: link.label }} />
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
        </AppShell>
    );
}
