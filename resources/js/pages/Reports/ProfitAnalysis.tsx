import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { TrendingUp, ChevronRight, Search, FileText } from 'lucide-react';

interface DailyProfit {
    date: string;
    sales: number;
    returns: number;
    net_sales: number;
    profit: number;
}

interface MonthlyProfit {
    month: string;
    sales: number;
    returns: number;
    net_sales: number;
    profit: number;
    days: DailyProfit[];
}

interface ProfitSummary {
    total_profit: number;
    monthly: MonthlyProfit[];
    daily: DailyProfit[];
}

interface Props {
    profitSummary: ProfitSummary;
    filters: {
        dateFrom: string;
        dateTo: string;
    }
}

function fmt(n: number): string {
    const isWhole = n % 1 === 0;
    return isWhole
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProfitAnalysis({ profitSummary, filters }: Props) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [dateFrom, setDateFrom] = useState(filters.dateFrom ?? '');
    const [dateTo, setDateTo] = useState(filters.dateTo ?? '');

    function toggleExpand(month: string) {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(month) ? next.delete(month) : next.add(month);
            return next;
        });
    }

    function search() {
        router.get('/reports/profit-analysis', {
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }, { preserveScroll: true });
    }

    return (
        <AppShell pageTitle="تحليل الأرباح الشامل">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">

                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">تحليل الأرباح الشامل</h1>
                    <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تحليل مفصل لصافي الأرباح الشهري واليومي</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 min-w-0 flex flex-col gap-6">
                        <div className="spatial-card p-6 flex flex-col gap-2 border border-primary/20 bg-primary/5">
                            <p className="text-sm font-black text-primary uppercase tracking-widest">صافي الربح للفترة المحددة</p>
                            <p className="text-4xl font-black text-primary">{fmt(profitSummary.total_profit)} <span className="text-lg">د.ل</span></p>
                        </div>

                        {/* Daily Table */}
                        <SpatialCard title={`التفصيل الشهري للأرباح (${profitSummary.monthly.length} شهر)`} icon={<TrendingUp className="w-4 h-4" />}>
                            {profitSummary.monthly.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                    <TrendingUp className="w-12 h-12 opacity-30" />
                                    <p className="font-bold">لا توجد مبيعات في هذه الفترة</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[16px]">
                                        <thead>
                                            <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                {['الشهر', 'صافي المبيعات', 'الربح', ''].map(h => (
                                                    <th key={h} className="text-right px-4 py-4 text-sm font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {profitSummary.monthly.map(m => (
                                                <React.Fragment key={m.month}>
                                                    <tr className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                        <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{m.month}</td>
                                                        <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{fmt(m.net_sales)}</td>
                                                        <td className="px-4 py-4 font-black text-emerald-600 dark:text-emerald-400">{fmt(m.profit)}</td>
                                                        <td className="px-4 py-4">
                                                            <button onClick={() => toggleExpand(m.month)}
                                                                className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/70 transition-colors">
                                                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded.has(m.month) ? 'rotate-90' : ''}`} />
                                                                تفاصيل
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {expanded.has(m.month) && (
                                                        <tr>
                                                            <td colSpan={4} className="px-6 py-4 bg-black/2 dark:bg-white/2 rounded-[16px] my-2">
                                                                <table className="w-full text-[15px]">
                                                                    <thead>
                                                                        <tr className="border-b border-black/5 dark:border-white/5">
                                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">التاريخ</th>
                                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">المبيعات</th>
                                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">المرتجعات</th>
                                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">صافي البيع</th>
                                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">الربح</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                                        {m.days.map((d, i) => (
                                                                            <tr key={i} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group">
                                                                                <td className="py-3 px-4 font-bold text-slate-600 dark:text-white/60">{d.date}</td>
                                                                                <td className="py-3 px-4 font-bold text-slate-500 dark:text-white/50">{fmt(d.sales)}</td>
                                                                                <td className="py-3 px-4 font-bold text-slate-500 dark:text-white/50">{fmt(d.returns)}</td>
                                                                                <td className="py-3 px-4 font-black text-slate-800 dark:text-white">{fmt(d.net_sales)}</td>
                                                                                <td className={`py-3 px-4 font-black ${d.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmt(d.profit)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-black/10 dark:border-white/10">
                                                <td className="px-4 py-4 font-black text-slate-500 dark:text-white/40 text-xs uppercase">الإجمالي</td>
                                                <td className="px-4 py-4 font-black text-slate-800 dark:text-white">
                                                    {fmt(profitSummary.monthly.reduce((a, b) => a + b.net_sales, 0))}
                                                </td>
                                                <td className="px-4 py-4 font-black text-emerald-600 dark:text-emerald-400">
                                                    {fmt(profitSummary.total_profit)}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </SpatialCard>
                    </div>

                    {/* Filter Sidebar */}
                    <div className="w-full lg:w-[320px] shrink-0">
                        <SpatialCard title="فلترة" icon={<FileText className="w-4 h-4" />}>
                            <div className="flex flex-col gap-4">
                                <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
                                <DateFilterInput label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
                                
                                <button onClick={search}
                                    className="w-full h-11 rounded-[14px] bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                                    <Search className="w-4 h-4" /> عرض التقرير
                                </button>
                                
                                {(dateFrom !== filters.dateFrom || dateTo !== filters.dateTo) && (
                                    <button onClick={() => {
                                        setDateFrom(filters.dateFrom);
                                        setDateTo(filters.dateTo);
                                        router.get('/reports/profit-analysis');
                                    }}
                                        className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                                        إعادة تعيين
                                    </button>
                                )}
                            </div>
                        </SpatialCard>
                    </div>
                </div>

            </div>
        </AppShell>
    );
}
