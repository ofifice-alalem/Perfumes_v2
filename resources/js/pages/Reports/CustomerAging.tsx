import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { Users, SlidersHorizontal, ChevronDown, Search, FileSpreadsheet, FileText, ChevronRight } from 'lucide-react';

interface Customer { id: number; name: string; }

interface Movement {
    type: 'invoice' | 'payment' | 'settlement' | 'return';
    ref: string;
    ref_id: number;
    amount: number;
    date: string | null;
    days_old: number | null;
    balance: number;
}

interface CustomerAging {
    customer_id: number;
    customer_name: string;
    total_debt: number;
    total_invoiced: number;
    total_paid: number;
    total_settled: number;
    total_returned: number;
    current: number;
    days_30_60: number;
    days_60_90: number;
    over_90: number;
    movements: Movement[];
}

interface Props {
    customers: Customer[];
    filters: { customerId: number | null; dateFrom: string | null; dateTo: string | null };
    data: CustomerAging[];
}

function fmt(n: number): string {
    const isWhole = n % 1 === 0;
    return isWhole
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function agingClass(days: number): string {
    if (days >= 90) return 'text-red-500 font-black';
    if (days >= 60) return 'text-amber-500 font-bold';
    if (days >= 30) return 'text-amber-400 font-bold';
    return 'text-emerald-600 dark:text-emerald-400 font-bold';
}

const typeConfig = {
    invoice:    { label: 'فاتورة',   class: 'text-slate-700 dark:text-white/80',          amountClass: 'text-red-500 font-black' },
    payment:    { label: 'دفعة',     class: 'text-emerald-600 dark:text-emerald-400',     amountClass: 'text-emerald-600 dark:text-emerald-400 font-bold' },
    settlement: { label: 'تسوية',    class: 'text-blue-500',                              amountClass: 'text-blue-500 font-bold' },
    return:     { label: 'مرتجع',    class: 'text-amber-500',                             amountClass: 'text-amber-500 font-bold' },
};

export default function CustomerAging({ customers, filters, data }: Props) {
    const [filterOpen, setFilterOpen] = useState(false);
    const [customerId, setCustomerId] = useState(filters.customerId ? String(filters.customerId) : '');
    const [dateFrom,   setDateFrom]   = useState(filters.dateFrom ?? '');
    const [dateTo,     setDateTo]     = useState(filters.dateTo ?? '');
    const [expanded,   setExpanded]   = useState<Set<number>>(new Set());

    const hasFilter = customerId || dateFrom || dateTo;

    function search() {
        router.get('/reports/customer-aging', {
            customer_id: customerId || undefined,
            date_from:   dateFrom   || undefined,
            date_to:     dateTo     || undefined,
        }, { preserveScroll: true });
    }

    function reset() {
        setCustomerId(''); setDateFrom(''); setDateTo('');
        router.get('/reports/customer-aging', {}, { preserveScroll: true });
    }

    function buildExportUrl(format: 'excel' | 'pdf') {
        const params = new URLSearchParams();
        if (customerId) params.set('customer_id', customerId);
        if (dateFrom)   params.set('date_from', dateFrom);
        if (dateTo)     params.set('date_to', dateTo);
        return `/reports/customer-aging/${format}?${params.toString()}`;
    }

    function toggleExpand(id: number) {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    const totalDebt   = data.reduce((s, c) => s + c.total_debt,   0);
    const totalOver90 = data.reduce((s, c) => s + c.over_90,      0);
    const total30_60  = data.reduce((s, c) => s + c.days_30_60,   0);
    const total60_90  = data.reduce((s, c) => s + c.days_60_90,   0);

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
            <ModernSelect
                label="العميل"
                placeholder="الكل"
                options={[{ label: 'الكل' }, ...customers.map(c => ({ label: c.name }))]}
                defaultValue={customerId ? (customers.find(c => String(c.id) === customerId)?.name ?? '') : 'الكل'}
                onSelect={val => setCustomerId(val === 'الكل' ? '' : String(customers.find(c => c.name === val)?.id ?? ''))}
            />
            <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={dateTo}   onChange={setDateTo} />
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
        <AppShell pageTitle="ديون العملاء">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">

                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">تقرير ديون العملاء</h1>
                    <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تحليل الديون وتصنيفها حسب عمر الدين</p>
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

                        {/* Summary + Export */}
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="spatial-card p-4 flex flex-col gap-1">
                                    <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">إجمالي الديون</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">{fmt(totalDebt)}</p>
                                </div>
                                <div className="spatial-card p-4 flex flex-col gap-1">
                                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest">30-60 يوم</p>
                                    <p className="text-2xl font-black text-amber-500">{fmt(total30_60)}</p>
                                </div>
                                <div className="spatial-card p-4 flex flex-col gap-1">
                                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest">60-90 يوم</p>
                                    <p className="text-2xl font-black text-amber-600">{fmt(total60_90)}</p>
                                </div>
                                <div className="spatial-card p-4 flex flex-col gap-1">
                                    <p className="text-xs font-black text-red-500 uppercase tracking-widest">أكثر 90 يوم</p>
                                    <p className="text-2xl font-black text-red-500">{fmt(totalOver90)}</p>
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
                        </div>

                        {/* Table */}
                        <SpatialCard title={`العملاء (${data.length})`} icon={<Users className="w-4 h-4" />}>
                            {data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                    <Users className="w-12 h-12 opacity-30" />
                                    <p className="font-bold">لا توجد ديون</p>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-[16px]">
                                            <thead>
                                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                    {['العميل', 'إجمالي الدين', 'أقل 30 يوم', '30-60 يوم', '60-90 يوم', 'أكثر 90 يوم', 'الحركات', ''].map(h => (
                                                        <th key={h} className="text-right px-4 py-4 text-sm font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {data.map(c => (
                                                    <>
                                                        <tr key={c.customer_id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                            <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{c.customer_name}</td>
                                                            <td className="px-4 py-4 font-black text-slate-800 dark:text-white whitespace-nowrap">{fmt(c.total_debt)}</td>
                                                            <td className="px-4 py-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(c.current)}</td>
                                                            <td className={`px-4 py-3 whitespace-nowrap ${c.days_30_60 > 0 ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-white/30'}`}>{fmt(c.days_30_60)}</td>
                                                            <td className={`px-4 py-3 whitespace-nowrap ${c.days_60_90 > 0 ? 'text-amber-600 font-bold' : 'text-slate-400 dark:text-white/30'}`}>{fmt(c.days_60_90)}</td>
                                                            <td className={`px-4 py-3 whitespace-nowrap ${c.over_90 > 0 ? 'text-red-500 font-black' : 'text-slate-400 dark:text-white/30'}`}>{fmt(c.over_90)}</td>
                                                            <td className="px-4 py-4 text-center font-bold text-slate-500 dark:text-white/50">{c.movements.length}</td>
                                                            <td className="px-4 py-4">
                                                                <button onClick={() => toggleExpand(c.customer_id)}
                                                                    className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/70 transition-colors">
                                                                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded.has(c.customer_id) ? 'rotate-90' : ''}`} />
                                                                    تفاصيل
                                                                </button>
                                                            </td>
                                                        </tr>
                                                        {expanded.has(c.customer_id) && (
                                                            <tr key={`${c.customer_id}-detail`}>
                                                                <td colSpan={8} className="px-6 py-4 bg-black/2 dark:bg-white/2">
                                                                    <table className="w-full text-xs">
                                                                        <thead>
                                                                            <tr className="border-b border-black/5 dark:border-white/5">
                                                                                <th className="text-right py-2 px-3 font-black text-slate-400 dark:text-white/30">المرجع</th>
                                                                                <th className="text-right py-2 px-3 font-black text-slate-400 dark:text-white/30">النوع</th>
                                                                                <th className="text-right py-2 px-3 font-black text-slate-400 dark:text-white/30">التاريخ</th>
                                                                                <th className="text-right py-2 px-3 font-black text-slate-400 dark:text-white/30">الإجمالي</th>
                                                                                <th className="text-right py-2 px-3 font-black text-slate-400 dark:text-white/30">العمر</th>
                                                                                <th className="text-right py-2 px-3 font-black text-slate-400 dark:text-white/30">الرصيد</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                                            {c.movements.map((m, i) => (
                                                                                <tr key={i} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group">
                                                                                    <td className="py-2 px-3 font-black text-primary">{m.ref}</td>
                                                                                    <td className={`py-2 px-3 font-bold ${typeConfig[m.type].class}`}>{typeConfig[m.type].label}</td>
                                                                                    <td className="py-2 px-3 text-slate-500 dark:text-white/50">{m.date ? m.date.slice(0, 10) : '--'}</td>
                                                                                    <td className={`py-2 px-3 ${typeConfig[m.type].amountClass}`}>
                                                                                        {m.amount > 0 ? '+' : ''}{fmt(m.amount)}
                                                                                    </td>
                                                                                    <td className={`py-2 px-3 ${m.days_old !== null ? agingClass(m.days_old) : 'text-slate-400 dark:text-white/30'}`}>
                                                                                        {m.days_old !== null ? `${m.days_old} يوم` : '—'}
                                                                                    </td>
                                                                                    <td className="py-2 px-3 font-black text-slate-800 dark:text-white">{fmt(m.balance)}</td>
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
                                        </table>
                                    </div>

                                    {/* Mobile */}
                                    <div className="flex flex-col gap-3 lg:hidden">
                                        {data.map(c => (
                                            <div key={c.customer_id} className="rounded-[20px] border border-black/8 dark:border-white/12 overflow-hidden">
                                                <div className="px-4 py-3 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                                    <span className="font-black text-slate-800 dark:text-white text-sm">{c.customer_name}</span>
                                                    <span className="font-black text-slate-800 dark:text-white text-sm">{fmt(c.total_debt)}</span>
                                                </div>
                                                <div className="px-4 py-2 flex flex-col gap-1.5 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">أقل 30 يوم</span>
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(c.current)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">30-60 يوم</span>
                                                        <span className={c.days_30_60 > 0 ? 'font-bold text-amber-500' : 'font-bold text-slate-400 dark:text-white/30'}>{fmt(c.days_30_60)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">60-90 يوم</span>
                                                        <span className={c.days_60_90 > 0 ? 'font-bold text-amber-600' : 'font-bold text-slate-400 dark:text-white/30'}>{fmt(c.days_60_90)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">أكثر 90 يوم</span>
                                                        <span className={c.over_90 > 0 ? 'font-black text-red-500' : 'font-bold text-slate-400 dark:text-white/30'}>{fmt(c.over_90)}</span>
                                                    </div>
                                                    <button onClick={() => toggleExpand(c.customer_id)}
                                                        className="flex items-center gap-1 text-xs font-bold text-primary mt-1">
                                                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded.has(c.customer_id) ? 'rotate-90' : ''}`} />
                                                        {expanded.has(c.customer_id) ? 'إخفاء الحركات' : `${c.movements.length} حركة`}
                                                    </button>
                                                    {expanded.has(c.customer_id) && c.movements.map((m, i) => (
                                                        <div key={i} className="flex justify-between text-xs border-t border-black/5 dark:border-white/5 pt-1.5 mt-0.5">
                                                            <span className="font-black text-primary">{m.ref}</span>
                                                            <span className={`font-bold ${typeConfig[m.type].class}`}>{typeConfig[m.type].label}</span>
                                                            <span className={typeConfig[m.type].amountClass}>{m.amount > 0 ? '+' : ''}{fmt(m.amount)}</span>
                                                            <span className="font-black text-slate-800 dark:text-white">{fmt(m.balance)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
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
